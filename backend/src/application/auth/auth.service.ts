import { Inject, Injectable } from '@nestjs/common'
import { sign, verify } from 'jsonwebtoken'
import { AuthError, AuthTokenPayload, UserAccount } from '../../domain/user'
import { AUTH_REPOSITORY, AuthRepository, RegisterUserCommand } from '../ports/auth.repository'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

@Injectable()
export class AuthService {
  constructor(@Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository) {}

  async register(command: RegisterUserCommand): Promise<{ user: UserAccount; token: string }> {
    const email = command.email.trim().toLowerCase()
    const fullName = command.fullName.trim()
    if (!EMAIL_PATTERN.test(email)) throw new AuthError('Email inválido', 'INVALID_EMAIL')
    if (fullName.length < 2) throw new AuthError('Nombre inválido', 'INVALID_EMAIL')
    if (command.password.length < 8) {
      throw new AuthError('La contraseña debe tener al menos 8 caracteres', 'WEAK_PASSWORD')
    }
    // Public self-registration creates cashiers only. Promote admins out-of-band.
    const user = await this.repository.register({
      email,
      fullName,
      password: command.password,
      role: 'cashier',
    })
    return { user, token: this.signToken(user) }
  }

  async login(email: string, password: string): Promise<{ user: UserAccount; token: string }> {
    const normalized = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalized) || !password) {
      throw new AuthError('Credenciales inválidas', 'INVALID_CREDENTIALS')
    }
    const user = await this.repository.authenticate(normalized, password)
    return { user, token: this.signToken(user) }
  }

  verifyToken(token: string): AuthTokenPayload {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET must be configured')
    const payload = verify(token, secret) as AuthTokenPayload
    if (!payload?.sub || !payload.email || !payload.role) {
      throw new AuthError('Credenciales inválidas', 'INVALID_CREDENTIALS')
    }
    return payload
  }

  private signToken(user: UserAccount): string {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET must be configured')
    const payload: AuthTokenPayload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    }
    return sign(payload, secret, { expiresIn: '12h' })
  }
}
