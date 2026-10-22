import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'

interface AuthenticatedRequest extends Request {
  user?: { sub?: string }
}

@Injectable()
export class AuthenticatedUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    if (!request.user?.sub) throw new UnauthorizedException('Authenticated identity is required')
    return true
  }
}
