import { IsIn, IsOptional, IsString } from 'class-validator'

export class PresignUploadDto {
  @IsString()
  filename!: string

  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType!: string

  @IsOptional()
  @IsString()
  @IsIn(['base-shoes', 'heel-styles'])
  folder?: string
}
