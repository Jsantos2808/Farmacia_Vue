import { randomUUID } from 'node:crypto'
import { compare, hash } from 'bcryptjs'
import { Collection, MongoClient } from 'mongodb'
import { AuthError, UserAccount, UserRole } from '../../domain/user'
import { AuthRepository, RegisterUserCommand } from '../../application/ports/auth.repository'

interface UserDocument {
  _id: string
  email: string
  fullName: string
  role: UserRole
  passwordHash: string
  createdAt: Date
}

export class MongoAuthRepository implements AuthRepository {
  private readonly users: Collection<UserDocument>

  constructor(client: MongoClient, databaseName: string) {
    this.users = client.db(databaseName).collection<UserDocument>('Users')
  }

  async ensureIndexes(): Promise<void> {
    await this.users.createIndex({ email: 1 }, { unique: true })
  }

  async register(command: RegisterUserCommand): Promise<UserAccount> {
    const existing = await this.users.findOne({ email: command.email })
    if (existing) throw new AuthError('Ya existe una cuenta con ese correo', 'EMAIL_TAKEN')
    const now = new Date()
    const document: UserDocument = {
      _id: randomUUID(),
      email: command.email,
      fullName: command.fullName,
      role: command.role ?? 'cashier',
      passwordHash: await hash(command.password, 10),
      createdAt: now,
    }
    try {
      await this.users.insertOne(document)
    } catch (error) {
      if (isDuplicateKey(error)) throw new AuthError('Ya existe una cuenta con ese correo', 'EMAIL_TAKEN')
      throw error
    }
    return toAccount(document)
  }

  async authenticate(email: string, password: string): Promise<UserAccount> {
    const user = await this.users.findOne({ email })
    if (!user) throw new AuthError('Correo o contraseña incorrectos', 'INVALID_CREDENTIALS')
    const ok = await compare(password, user.passwordHash)
    if (!ok) throw new AuthError('Correo o contraseña incorrectos', 'INVALID_CREDENTIALS')
    return toAccount(user)
  }

  async findById(id: string): Promise<UserAccount | null> {
    const user = await this.users.findOne({ _id: id })
    return user ? toAccount(user) : null
  }
}

function toAccount(document: UserDocument): UserAccount {
  return {
    id: document._id,
    email: document.email,
    fullName: document.fullName,
    role: document.role,
    createdAt: document.createdAt,
  }
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000
}
