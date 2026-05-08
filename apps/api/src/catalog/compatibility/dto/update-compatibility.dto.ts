import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator'

export class CompatibilityItemDto {
  @IsString()
  heelStyleId!: string

  @IsBoolean()
  isCompatible!: boolean

  @IsOptional()
  @IsString()
  notes?: string
}

export class BulkUpdateCompatibilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompatibilityItemDto)
  items!: CompatibilityItemDto[]
}
