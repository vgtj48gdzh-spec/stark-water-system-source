import { Column, Entity, Index } from 'typeorm';
import { WaterBaseEntity } from '../common/water-base.entity';
import { XiaolongxiaKnowledgeCategory, XiaolongxiaKnowledgeStatus } from './xiaolongxia.enums';

/**
 * V1 design-stage skeleton. This entity is intentionally NOT registered in
 * src/modules/water/water.entities.ts or src/database/data-source.ts.
 * Registration requires owner approval and a reviewed migration first.
 */
@Entity({ name: 'water_xiaolongxia_knowledge_entries' })
@Index(['status'])
@Index(['category'])
export class WaterXiaolongxiaKnowledgeEntryEntity extends WaterBaseEntity {
  @Column({ name: 'entry_code', type: 'varchar', length: 80, unique: true })
  entryCode!: string;

  @Column({ name: 'title', type: 'varchar', length: 200 })
  title!: string;

  @Column({ name: 'category', type: 'varchar', length: 40, default: XiaolongxiaKnowledgeCategory.Other })
  category!: XiaolongxiaKnowledgeCategory;

  // Public business copy or FAQ body only. Real customer privacy is forbidden.
  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({ name: 'answer_template', type: 'text', nullable: true })
  answerTemplate?: string | null;

  // Comma-separated retrieval keywords for first-pass assistant matching.
  @Column({ name: 'keywords', type: 'varchar', length: 500, nullable: true })
  keywords?: string | null;

  @Column({ name: 'status', type: 'varchar', length: 24, default: XiaolongxiaKnowledgeStatus.Draft })
  status!: XiaolongxiaKnowledgeStatus;

  @Column({ name: 'review_required', type: 'boolean', default: true })
  reviewRequired!: boolean;

  @Column({ name: 'reviewed_by', type: 'varchar', length: 64, nullable: true })
  reviewedBy?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date | null;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt?: Date | null;
}
