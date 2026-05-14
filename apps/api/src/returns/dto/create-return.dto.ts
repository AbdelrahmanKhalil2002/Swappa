import { IsEnum, IsOptional, IsString, IsArray, ValidateNested, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ReturnType, ReturnReason } from '@prisma/client'

export class ReturnItemDto {
  @IsString()
  orderItemId!: string

  @IsInt()
  @Min(1)
  quantity!: number
}

export class CreateReturnDto {
  @IsString()
  orderId!: string

  @IsEnum(ReturnType)
  type!: ReturnType

  @IsEnum(ReturnReason)
  reason!: ReturnReason

  @IsOptional()
  @IsString()
  reasonNotes?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[]
}
