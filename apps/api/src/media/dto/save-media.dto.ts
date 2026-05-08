import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator'
import { MediaType } from '@prisma/client'

export class SaveMediaDto {
  @IsString()
  url!: string

  @IsString()
  key!: string

  @IsOptional()
  @IsString()
  alt?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number

  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType

  @IsOptional()
  @IsString()
  baseShoeId?: string

  @IsOptional()
  @IsString()
  heelStyleId?: string
}
