import { IsEnum, IsOptional, IsString } from 'class-validator'

export class ReviewQCDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED'

  @IsOptional()
  @IsString()
  rejectionReason?: string
}
