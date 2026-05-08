import { IsInt, IsOptional, IsString, Min } from 'class-validator'

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
  @IsString()
  baseShoeId?: string

  @IsOptional()
  @IsString()
  heelStyleId?: string
}
