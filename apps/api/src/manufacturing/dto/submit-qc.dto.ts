import { IsObject, IsOptional, IsString } from 'class-validator'

export class SubmitQCDto {
  @IsObject()
  checklistResults!: Record<string, boolean>

  @IsOptional()
  @IsString()
  defectNotes?: string

  @IsOptional()
  @IsString({ each: true })
  defectPhotoUrls?: string[]
}
