import { IsEnum, IsOptional, IsString, IsNumber, IsDateString } from 'class-validator'
import { Carrier } from '@prisma/client'

export class CreateShipmentDto {
  @IsEnum(Carrier)
  carrier!: Carrier

  @IsOptional()
  @IsString()
  trackingNumber?: string

  @IsOptional()
  @IsNumber()
  shippingCost?: number

  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string
}
