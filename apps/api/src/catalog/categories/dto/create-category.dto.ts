import { IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateCategoryDto {
  @IsString()
  @MaxLength(100)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  parentId?: string
}
