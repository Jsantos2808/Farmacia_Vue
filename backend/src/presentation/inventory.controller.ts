import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Type } from 'class-transformer'
import { IsDate, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator'
import { InventoryService } from '../application/inventory/inventory.service'
import { InventoryError } from '../domain/inventory'
import { AuthenticatedRequest } from './auth.middleware'
import { AuthenticatedUserGuard } from './authenticated-user.guard'
import { RolesGuard } from './roles.guard'

class ReceiveStockRequest {
  @IsString()
  @MinLength(1)
  sku!: string

  @IsString()
  @MinLength(1)
  batchId!: string

  @IsInt()
  @Min(1)
  quantity!: number

  @Type(() => Date)
  @IsDate()
  expiresAt!: Date

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number

  @IsOptional()
  @IsString()
  notes?: string
}

@Controller('inventory')
@UseGuards(AuthenticatedUserGuard, RolesGuard)
export class InventoryController {
  constructor(@Inject(InventoryService) private readonly inventoryService: InventoryService) {}

  @Post('receipts')
  async receive(@Body() body: ReceiveStockRequest, @Req() request: AuthenticatedRequest) {
    try {
      return await this.inventoryService.receive({
        ...body,
        userId: request.user!.sub,
      })
    } catch (error) {
      if (error instanceof InventoryError) {
        if (error.code === 'PRODUCT_NOT_FOUND') throw new NotFoundException(error.message)
        throw new BadRequestException(error.message)
      }
      throw error
    }
  }

  @Get('batches')
  listBatches(@Query('sku') sku?: string) {
    return this.inventoryService.listBatches(sku)
  }

  @Get('stock')
  stock() {
    return this.inventoryService.stockBySku()
  }
}
