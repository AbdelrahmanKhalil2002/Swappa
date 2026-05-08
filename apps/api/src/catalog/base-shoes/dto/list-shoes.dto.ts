import { HeelType, ProductStatus } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ListShoesDto {
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus

  @IsOptional()
  @IsString()
  categoryId?: string

  @IsOptional()
  @IsEnum(HeelType)
  heelType?: HeelType

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}
