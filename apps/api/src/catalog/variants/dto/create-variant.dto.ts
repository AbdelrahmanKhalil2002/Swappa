import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateVariantDto {
  @IsString()
  baseShoeId!: string

  @IsString()
  @MaxLength(20)
  size!: string

  @IsString()
  @MaxLength(60)
  color!: string

  @IsOptional()
  @IsString()
  @MaxLength(60)
  material?: string

  @IsString()
  @MaxLength(60)
  sku!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number
}
