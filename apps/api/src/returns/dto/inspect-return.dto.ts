import { IsOptional, IsString, IsArray, ValidateNested, IsEnum } from 'class-validator'
import { Type } from 'class-transformer'
import { ReturnItemCondition } from '@prisma/client'

export class InspectItemDto {
  @IsString()
  returnItemId!: string

  @IsEnum(ReturnItemCondition)
  condition!: ReturnItemCondition

  @IsOptional()
  @IsString()
  notes?: string
}

export class InspectReturnDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectItemDto)
  items!: InspectItemDto[]

  @IsOptional()
  @IsString()
  notes?: string
}
