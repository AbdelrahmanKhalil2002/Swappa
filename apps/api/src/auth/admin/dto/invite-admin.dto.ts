import { IsEmail, IsString, IsNotEmpty } from 'class-validator'

export class InviteAdminDto {
  @IsEmail()
  email!: string

  @IsString()
  @IsNotEmpty()
  roleId!: string
}
