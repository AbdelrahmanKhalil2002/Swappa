import { IsInt, IsOptional, Max, Min } from 'class-validator'

export class UpdateSizeProfileDto {
  @IsOptional()
  @IsInt()
  @Min(180)
  @Max(350)
  footLengthMm?: number

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(130)
  footWidthMm?: number
}
