import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator'

export class AdvanceStageDto {
  @IsString()
  stage!: string

  @IsInt()
  @IsPositive()
  unitsCompleted!: number

  @IsOptional()
  @IsString()
  notes?: string
}
