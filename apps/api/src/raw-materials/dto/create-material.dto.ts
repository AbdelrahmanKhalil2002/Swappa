import {
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

export enum UnitOfMeasure {
  UNITS = 'UNITS',
  METERS = 'METERS',
  SQM = 'SQM',
  KG = 'KG',
  GRAMS = 'GRAMS',
  LITERS = 'LITERS',
  ML = 'ML',
}

export enum MaterialCategory {
  LEATHER = 'LEATHER',
  HARDWARE = 'HARDWARE',
  COMPONENTS = 'COMPONENTS',
  ADHESIVES = 'ADHESIVES',
  PACKAGING = 'PACKAGING',
  OTHER = 'OTHER',
}

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  sku!: string

  @IsString()
  @IsOptional()
  description?: string

  @IsEnum(MaterialCategory)
  category!: MaterialCategory

  @IsEnum(UnitOfMeasure)
  unit!: UnitOfMeasure

  @IsNumber()
  @Min(0)
  costPerUnit!: number

  @IsString()
  @IsOptional()
  supplier?: string

  @IsNumber()
  @Min(0)
  minStockLevel!: number
}

export class UpdateMaterialDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsEnum(MaterialCategory)
  @IsOptional()
  category?: MaterialCategory

  @IsEnum(UnitOfMeasure)
  @IsOptional()
  unit?: UnitOfMeasure

  @IsNumber()
  @Min(0)
  @IsOptional()
  costPerUnit?: number

  @IsString()
  @IsOptional()
  supplier?: string

  @IsNumber()
  @Min(0)
  @IsOptional()
  minStockLevel?: number
}

export class ReceiveMaterialDto {
  @IsNumber()
  @Min(0.0001)
  quantity!: number

  @IsNumber()
  @Min(0)
  costPerUnit!: number

  @IsString()
  @IsOptional()
  reference?: string
}

export class AdjustMaterialDto {
  @IsNumber()
  delta!: number

  @IsString()
  @IsNotEmpty()
  reason!: string
}

export class WriteOffMaterialDto {
  @IsNumber()
  @Min(0.0001)
  quantity!: number

  @IsString()
  @IsNotEmpty()
  reason!: string
}
