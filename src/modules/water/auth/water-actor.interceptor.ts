import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { WaterRequestWithActor } from './water-auth.types';

@Injectable()
export class WaterActorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<WaterRequestWithActor>();
    if (request.waterActor && isWriteMethod(request.method) && request.body && typeof request.body === 'object') {
      request.body.created_by = request.waterActor.actorId;
      request.body.updated_by = request.waterActor.actorId;
      request.body.actor_role = request.waterActor.actorRole;
    }
    return next.handle();
  }
}

function isWriteMethod(method: string | undefined): boolean {
  return ['POST', 'PATCH', 'PUT', 'DELETE'].includes(String(method ?? '').toUpperCase());
}
