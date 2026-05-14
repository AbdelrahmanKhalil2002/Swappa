import { IsEmail, IsOptional, IsString } from 'class-validator'

export class CreateSupplierDto {
  @IsString()
  name!: string

  @IsString()
  code!: string

  @IsEmail()
  contactEmail!: string

  @IsOptional()
  @IsString()
  contactName?: string

  @IsOptional()
  @IsString()
  contactPhone?: string

  @IsOptional()
  @IsString()
  website?: string

  @IsOptional()
  @IsString()
  paymentTerms?: string

  @IsOptional()
  @IsString()
  notes?: string
}
