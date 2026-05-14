import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator'
import { ShipmentStatus } from '@prisma/client'

export class UpdateShipmentStatusDto {
  @IsEnum(ShipmentStatus)
  status!: ShipmentStatus

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  location?: string

  @IsOptional()
  @IsDateString()
  occurredAt?: string
}
