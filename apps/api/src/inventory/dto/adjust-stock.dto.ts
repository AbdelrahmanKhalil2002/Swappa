import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'

export class AdjustStockDto {
  @IsInt()
  delta!: number // positive = add, negative = remove

  @IsString()
  @IsNotEmpty()
  reason!: string
}

export class WriteOffDto {
  @IsInt()
  @Min(1)
  quantity!: number

  @IsString()
  @IsNotEmpty()
  reason!: string
}

export class StocktakeItemDto {
  @IsString()
  variantId!: string

  @IsInt()
  @Min(0)
  physicalCount!: number
}
