import { Inject, Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'
import { AuthService } from '../application/auth/auth.service'
import { AuthTokenPayload } from '../domain/user'

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  use(request: AuthenticatedRequest, _response: Response, next: NextFunction): void {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      next()
      return
    }
    try {
      request.user = this.authService.verifyToken(header.slice('Bearer '.length).trim())
      next()
    } catch {
      _response.status(401).json({ statusCode: 401, message: 'Token inválido o expirado' })
    }
  }
}
