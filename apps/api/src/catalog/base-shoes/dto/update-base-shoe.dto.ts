import { PartialType } from '@nestjs/mapped-types'
import { CreateBaseShoeDto } from './create-base-shoe.dto'

export class UpdateBaseShoeDto extends PartialType(CreateBaseShoeDto) {}
