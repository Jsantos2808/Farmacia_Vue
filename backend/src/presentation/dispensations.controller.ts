import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator'
import { DispenseControlledMedication } from '../application/dispense-controlled-medication'
import { DispensationError } from '../domain/dispensation'
import { AuthenticatedUserGuard } from './authenticated-user.guard'
import { Request } from 'express'

interface AuthenticatedRequest extends Request {
  user: { sub: string }
}

class DispenseRequest {
  @IsString()
  @IsNotEmpty()
  sku!: string

  @IsInt()
  @Min(1)
  quantity!: number

  @IsString()
  @IsNotEmpty()
  prescriptionFolio!: string

  @IsString()
  @IsNotEmpty()
  prescriberId!: string
}

@Controller('dispensations')
@UseGuards(AuthenticatedUserGuard)
export class DispensationsController {
  constructor(private readonly dispenseMedication: DispenseControlledMedication) {}

  @Post()
  async dispense(@Body() body: DispenseRequest, @Req() request: AuthenticatedRequest) {
    try {
      return await this.dispenseMedication.execute({
        ...body,
        userId: request.user.sub,
      })
    } catch (error) {
      if (error instanceof DispensationError) {
        if (error.code === 'PRODUCT_NOT_FOUND') throw new NotFoundException(error.message)
        throw new ConflictException(error.message)
      }
      if (error instanceof TypeError) throw new BadRequestException(error.message)
      throw error
    }
  }
}
