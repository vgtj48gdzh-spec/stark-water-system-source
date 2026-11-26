import { Injectable } from '@nestjs/common';
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { EntityManager, IsNull, MoreThan } from 'typeorm';
import dataSource from '../../../database/data-source';
import { WaterErrorCode, waterUnauthorized } from '../common/water-api-error';
import { apiKey, baseRecord, saveAudit, toApiRecord } from '../common/water-db.service';
import { WaterRole } from '../common/water.enums';
import { WaterAdminSessionEntity } from './water-admin-session.entity';
import { WaterAdminUserEntity } from './water-admin-user.entity';
import { WaterActor } from './water-auth.types';

const PASSWORD_ALGORITHM = 'pbkdf2_sha256';
const PASSWORD_ITERATIONS = 120_000;
const PASSWORD_KEY_LENGTH = 32;
const SESSION_HOURS = 12;

interface LoginMetadata {
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class WaterAuthService {
  async login(username: string, password: string, metadata: LoginMetadata = {}) {
    const manager = await this.manager();
    const user = await this.findOrBootstrapUser(manager, username);
    if (!user || user.status !== 'ACTIVE' || !verifyWaterAdminPassword(password, user.passwordHash)) {
      await this.auditAuth(manager, {
        action: 'water.auth.login_failed',
        actorId: username || 'unknown',
        actorRole: WaterRole.Admin,
        targetType: 'water_admin_user',
        reason: 'invalid username or password',
        metadata,
      });
      throw waterUnauthorized(WaterErrorCode.PermissionDenied, 'invalid water admin username or password');
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
    const session = await manager.save(WaterAdminSessionEntity, {
      ...baseRecord('auth_session', user.id, user.regionId, apiKey('auth_session', tokenHash)),
      userId: user.id,
      tokenHash,
      expiresAt,
      revokedAt: null,
      lastSeenAt: new Date(),
      ipAddress: metadata.ipAddress ?? null,
      userAgent: metadata.userAgent ?? null,
    });
    await manager.update(WaterAdminUserEntity, user.id, { lastLoginAt: new Date(), updatedBy: user.id });
    await this.auditAuth(manager, {
      action: 'water.auth.login_succeeded',
      actorId: user.id,
      actorRole: user.role,
      targetType: 'water_admin_user',
      targetId: user.id,
      reason: 'water admin login',
      metadata,
    });

    return {
      token,
      expires_at: expiresAt.toISOString(),
      user: this.toUserView(user),
      session: toApiRecord(session),
    };
  }

  async authenticate(token: string | undefined): Promise<WaterActor> {
    if (!token) {
      throw waterUnauthorized(WaterErrorCode.PermissionDenied, 'water admin token is required');
    }

    const manager = await this.manager();
    const session = await manager.findOne(WaterAdminSessionEntity, {
      where: {
        tokenHash: hashSessionToken(token),
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
    if (!session) {
      throw waterUnauthorized(WaterErrorCode.PermissionDenied, 'water admin session is missing or expired');
    }

    const user = await manager.findOneBy(WaterAdminUserEntity, { id: session.userId });
    if (!user || user.status !== 'ACTIVE') {
      throw waterUnauthorized(WaterErrorCode.PermissionDenied, 'water admin user is disabled or missing');
    }

    await manager.update(WaterAdminSessionEntity, session.id, { lastSeenAt: new Date(), updatedBy: user.id });
    return {
      actorId: user.id,
      actorRole: user.role,
      username: user.username,
      sessionId: session.id,
    };
  }

  async me(actor: WaterActor) {
    const manager = await this.manager();
    const user = await manager.findOneBy(WaterAdminUserEntity, { id: actor.actorId });
    if (!user) {
      throw waterUnauthorized(WaterErrorCode.PermissionDenied, 'water admin user is missing');
    }
    return this.toUserView(user);
  }

  async logout(token: string | undefined, actor: WaterActor, metadata: LoginMetadata = {}) {
    if (!token) return { logged_out: true };
    const manager = await this.manager();
    const session = await manager.findOneBy(WaterAdminSessionEntity, { tokenHash: hashSessionToken(token) });
    if (session && !session.revokedAt) {
      await manager.update(WaterAdminSessionEntity, session.id, {
        revokedAt: new Date(),
        updatedBy: actor.actorId,
      });
    }
    await this.auditAuth(manager, {
      action: 'water.auth.logout',
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      targetType: 'water_admin_session',
      targetId: session?.id ?? null,
      reason: 'water admin logout',
      metadata,
    });
    return { logged_out: true };
  }

  private async findOrBootstrapUser(manager: EntityManager, username: string) {
    const user = await manager.findOneBy(WaterAdminUserEntity, { username });
    if (user) return user;

    const bootstrapUsername = process.env.WATER_ADMIN_BOOTSTRAP_USERNAME;
    const bootstrapPassword = process.env.WATER_ADMIN_BOOTSTRAP_PASSWORD;
    if (!bootstrapUsername || !bootstrapPassword || username !== bootstrapUsername) {
      return null;
    }

    const role = parseRole(process.env.WATER_ADMIN_BOOTSTRAP_ROLE) ?? WaterRole.Owner;
    return manager.save(WaterAdminUserEntity, {
      ...baseRecord('auth_bootstrap_user', 'bootstrap', null, apiKey('auth_bootstrap_user', bootstrapUsername)),
      username: bootstrapUsername,
      passwordHash: hashWaterAdminPassword(bootstrapPassword),
      displayName: process.env.WATER_ADMIN_BOOTSTRAP_DISPLAY_NAME ?? 'Water Trial Owner',
      role,
      status: 'ACTIVE',
    });
  }

  private async auditAuth(
    manager: EntityManager,
    input: {
      action: string;
      actorId: string;
      actorRole: WaterRole;
      targetType: string;
      targetId?: string | null;
      reason: string;
      metadata?: LoginMetadata;
    },
  ) {
    return saveAudit(manager, {
      action: input.action,
      actorId: input.actorId,
      actorRole: input.actorRole,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      after: {
        ip_address: input.metadata?.ipAddress ?? null,
        user_agent: input.metadata?.userAgent ?? null,
      },
      reason: input.reason,
      key: apiKey('auth_audit', input.action, input.actorId, Date.now(), randomBytes(4).toString('hex')),
    });
  }

  private toUserView(user: WaterAdminUserEntity) {
    return {
      id: user.id,
      username: user.username,
      display_name: user.displayName ?? user.username,
      role: user.role,
      status: user.status,
      last_login_at: user.lastLoginAt?.toISOString?.() ?? null,
    };
  }

  private async manager(): Promise<EntityManager> {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    return dataSource.manager;
  }
}

export function hashWaterAdminPassword(password: string, salt = randomBytes(16).toString('hex')): string {
  const hash = pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, 'sha256').toString('hex');
  return `${PASSWORD_ALGORITHM}$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

export function verifyWaterAdminPassword(password: string, passwordHash: string): boolean {
  const [algorithm, iterationsRaw, salt, expectedHash] = passwordHash.split('$');
  if (algorithm !== PASSWORD_ALGORITHM || !iterationsRaw || !salt || !expectedHash) return false;
  const iterations = Number(iterationsRaw);
  const expected = Buffer.from(expectedHash, 'hex');
  const actual = pbkdf2Sync(password, salt, iterations, expected.length, 'sha256');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createWaterAdminUser(
  manager: EntityManager,
  input: {
    username: string;
    password: string;
    role: WaterRole;
    displayName?: string;
    actorId?: string;
    idempotencyKey?: string;
  },
) {
  const existing = await manager.findOneBy(WaterAdminUserEntity, { username: input.username });
  if (existing) return existing;
  return manager.save(WaterAdminUserEntity, {
    ...baseRecord(
      'auth_seed_user',
      input.actorId ?? 'seed',
      null,
      input.idempotencyKey ?? apiKey('auth_seed_user', input.username),
    ),
    username: input.username,
    passwordHash: hashWaterAdminPassword(input.password),
    displayName: input.displayName ?? input.username,
    role: input.role,
    status: 'ACTIVE',
  });
}

function parseRole(role: string | undefined): WaterRole | null {
  if (!role) return null;
  return Object.values(WaterRole).includes(role as WaterRole) ? (role as WaterRole) : null;
}
