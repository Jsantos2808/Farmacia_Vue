import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Inject,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator'
import { DispenseControlledMedication } from '../application/dispense-controlled-medication'
import { DispensationError } from '../domain/dispensation'
import { AuthenticatedRequest } from './auth.middleware'
import { AuthenticatedUserGuard } from './authenticated-user.guard'
import { RolesGuard } from './roles.guard'

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
@UseGuards(AuthenticatedUserGuard, RolesGuard)
export class DispensationsController {
  constructor(
    @Inject(DispenseControlledMedication)
    private readonly dispenseMedication: DispenseControlledMedication,
  ) {}

  @Post()
  async dispense(@Body() body: DispenseRequest, @Req() request: AuthenticatedRequest) {
    try {
      return await this.dispenseMedication.execute({
        ...body,
        userId: request.user!.sub,
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
