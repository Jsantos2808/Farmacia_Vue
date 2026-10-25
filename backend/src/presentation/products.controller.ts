import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common'
import { IsIn, IsInt, IsNumber, IsString, Min, MinLength } from 'class-validator'
import { ProductService } from '../application/products/product.service'
import { ControlCategory, ProductError, SellMode } from '../domain/product'
import { AuthenticatedUserGuard } from './authenticated-user.guard'
import { Roles, RolesGuard } from './roles.guard'

class CreateProductRequest {
  @IsString()
  @MinLength(1)
  sku!: string

  @IsString()
  @MinLength(1)
  name!: string

  @IsString()
  @MinLength(1)
  description!: string

  @IsIn(['UNIT', 'BOX'])
  sellMode!: SellMode

  @IsInt()
  @Min(1)
  unitsPerBox!: number

  @IsNumber()
  @Min(0)
  unitPrice!: number

  @IsIn(['OTC', 'PRESCRIPTION', 'PSYCHOTROPIC', 'ANTIBIOTIC'])
  controlCategory!: ControlCategory

  @IsInt()
  @Min(0)
  minimumStock!: number
}

@Controller('products')
@UseGuards(AuthenticatedUserGuard, RolesGuard)
export class ProductsController {
  constructor(@Inject(ProductService) private readonly productService: ProductService) {}

  @Get()
  list() {
    return this.productService.list()
  }

  @Post()
  @Roles('admin', 'cashier')
  async create(@Body() body: CreateProductRequest) {
    try {
      return await this.productService.create(body)
    } catch (error) {
      if (error instanceof ProductError) {
        if (error.code === 'SKU_TAKEN') throw new ConflictException(error.message)
        throw new BadRequestException(error.message)
      }
      throw error
    }
  }
}
