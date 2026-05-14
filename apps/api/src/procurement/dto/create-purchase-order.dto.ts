import { Type } from 'class-transformer'
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator'

export class POLineDto {
  @IsString()
  materialId!: string

  @IsPositive()
  quantityOrdered!: number

  @IsPositive()
  unitCost!: number
}

export class CreatePurchaseOrderDto {
  @IsString()
  supplierId!: string

  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POLineDto)
  lines!: POLineDto[]
}
