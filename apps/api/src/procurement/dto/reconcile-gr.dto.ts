import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator'

export class GRLineDto {
  @IsString()
  purchaseOrderLineId!: string

  @IsPositive()
  quantityReceived!: number

  @IsOptional()
  @IsBoolean()
  hasShortage?: boolean

  @IsOptional()
  @IsString()
  shortageNotes?: string
}

export class ReconcileGRDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GRLineDto)
  lines!: GRLineDto[]

  @IsOptional()
  @IsString()
  notes?: string
}
