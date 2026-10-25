import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { SaleService } from '../application/sales/sale.service'
import { SaleError } from '../domain/sale'
import { SellMode } from '../domain/product'
import { AuthenticatedRequest } from './auth.middleware'
import { AuthenticatedUserGuard } from './authenticated-user.guard'
import { RolesGuard } from './roles.guard'

class SaleLineRequest {
  @IsString()
  @MinLength(1)
  sku!: string

  @IsInt()
  @Min(1)
  quantity!: number

  @IsIn(['UNIT', 'BOX'])
  sellMode!: SellMode
}

class CompleteSaleRequest {
  @IsString()
  @MinLength(2)
  customerName!: string

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleLineRequest)
  lines!: SaleLineRequest[]
}

@Controller('sales')
@UseGuards(AuthenticatedUserGuard, RolesGuard)
export class SalesController {
  constructor(@Inject(SaleService) private readonly saleService: SaleService) {}

  @Post()
  async complete(@Body() body: CompleteSaleRequest, @Req() request: AuthenticatedRequest) {
    try {
      return await this.saleService.complete({
        customerName: body.customerName,
        lines: body.lines,
        userId: request.user!.sub,
        cashierName: request.user!.fullName,
      })
    } catch (error) {
      mapSaleError(error)
    }
  }

  @Get()
  list(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 50
    return this.saleService.listRecent(Number.isFinite(parsed) ? parsed : 50)
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const sale = await this.saleService.findById(id)
    if (!sale) throw new NotFoundException('Venta no encontrada')
    return sale
  }
}

function mapSaleError(error: unknown): never {
  if (error instanceof SaleError) {
    if (error.code === 'PRODUCT_NOT_FOUND') throw new NotFoundException(error.message)
    if (error.code === 'INSUFFICIENT_STOCK' || error.code === 'PRESCRIPTION_REQUIRED') {
      throw new ConflictException(error.message)
    }
    throw new BadRequestException(error.message)
  }
  throw error
}
