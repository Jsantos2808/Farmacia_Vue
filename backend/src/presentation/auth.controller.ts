import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { IsEmail, IsString, MinLength } from 'class-validator'
import { AuthService } from '../application/auth/auth.service'
import { AuthError } from '../domain/user'
import { AuthenticatedRequest } from './auth.middleware'
import { AuthenticatedUserGuard } from './authenticated-user.guard'

class RegisterRequest {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(2)
  fullName!: string

  @IsString()
  @MinLength(8)
  password!: string
}

class LoginRequest {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(1)
  password!: string
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterRequest) {
    try {
      const result = await this.authService.register(body)
      return {
        token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
        },
      }
    } catch (error) {
      mapAuthError(error)
    }
  }

  @Post('login')
  async login(@Body() body: LoginRequest) {
    try {
      const result = await this.authService.login(body.email, body.password)
      return {
        token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
        },
      }
    } catch (error) {
      mapAuthError(error)
    }
  }

  @Get('me')
  @UseGuards(AuthenticatedUserGuard)
  me(@Req() request: AuthenticatedRequest) {
    return {
      id: request.user!.sub,
      email: request.user!.email,
      fullName: request.user!.fullName,
      role: request.user!.role,
    }
  }
}

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    if (error.code === 'EMAIL_TAKEN') throw new ConflictException(error.message)
    if (error.code === 'INVALID_CREDENTIALS') throw new UnauthorizedException(error.message)
    throw new BadRequestException(error.message)
  }
  throw error
}
