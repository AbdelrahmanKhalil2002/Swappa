import { IsString, IsNotEmpty, MinLength } from 'class-validator'

export class AcceptInviteDto {
  @IsString()
  @IsNotEmpty()
  token!: string

  @IsString()
  @IsNotEmpty()
  firstName!: string

  @IsString()
  @IsNotEmpty()
  lastName!: string

  @IsString()
  @MinLength(8)
  password!: string
}
