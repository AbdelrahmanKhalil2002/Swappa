import { Type } from 'class-transformer'
import {
  IsArray, IsEmail, IsIn, IsOptional, IsString,
  ValidateNested, IsInt, Min, IsPositive,
} from 'class-validator'

export class CartItemDto {
  @IsString()
  variantId!: string

  @IsOptional()
  @IsString()
  heelStyleId?: string

  @IsInt()
  @Min(1)
  quantity!: number
}

export class CreateIntentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[]

  @IsEmail()
  email!: string

  @IsString()
  firstName!: string

  @IsString()
  lastName!: string

  @IsString()
  phone!: string

  @IsString()
  addressLine1!: string

  @IsOptional()
  @IsString()
  addressLine2?: string

  @IsString()
  city!: string

  @IsString()
  governorate!: string

  @IsIn(['standard', 'express'])
  shippingMethod!: 'standard' | 'express'

  @IsOptional()
  @IsString()
  couponCode?: string

  @IsOptional()
  @IsString()
  notes?: string
}
