import { ProductStatus } from '@prisma/client'
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateBaseShoeDto {
  @IsString()
  @MaxLength(120)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(140)
  slug?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus

  @IsOptional()
  @IsString()
  categoryId?: string

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  basePrice!: number

  @IsOptional()
  @IsString()
  @MaxLength(120)
  seoTitle?: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoDescription?: string
}
