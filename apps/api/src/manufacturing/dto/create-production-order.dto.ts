import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator'

export class CreateProductionOrderDto {
  @IsString()
  variantId!: string

  @IsInt()
  @IsPositive()
  quantity!: number

  @IsOptional()
  @IsPositive()
  overheadCostPerUnit?: number

  @IsOptional()
  @IsString()
  notes?: string
}
