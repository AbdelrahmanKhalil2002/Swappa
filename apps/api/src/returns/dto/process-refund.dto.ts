import { IsEnum, IsNumber, IsPositive } from 'class-validator'
import { RefundMethod } from '@prisma/client'

export class ProcessRefundDto {
  @IsEnum(RefundMethod)
  method!: RefundMethod

  @IsNumber()
  @IsPositive()
  amount!: number
}
