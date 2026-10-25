import { UserAccount, UserRole } from '../../domain/user'

export interface RegisterUserCommand {
  readonly email: string
  readonly fullName: string
  readonly password: string
  readonly role?: UserRole
}

export interface AuthRepository {
  register(command: RegisterUserCommand): Promise<UserAccount>
  authenticate(email: string, password: string): Promise<UserAccount>
  findById(id: string): Promise<UserAccount | null>
}

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY')
