export type UserRole = 'admin' | 'cashier'

export interface UserAccount {
  readonly id: string
  readonly email: string
  readonly fullName: string
  readonly role: UserRole
  readonly createdAt: Date
}

export interface AuthTokenPayload {
  readonly sub: string
  readonly email: string
  readonly fullName: string
  readonly role: UserRole
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: 'EMAIL_TAKEN' | 'INVALID_CREDENTIALS' | 'WEAK_PASSWORD' | 'INVALID_EMAIL',
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
