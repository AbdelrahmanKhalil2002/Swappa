import { HeelMaterial, HeelType, ProductStatus } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator'

export class CreateHeelStyleDto {
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

  @IsEnum(HeelType)
  type!: HeelType

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @IsPositive()
  heightCm!: number

  @IsOptional()
  @IsEnum(HeelMaterial)
  material?: HeelMaterial

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  addedPrice?: number

  @IsOptional()
  @IsString()
  layerImageUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  seoTitle?: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoDescription?: string
}
