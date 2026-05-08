import { PartialType } from '@nestjs/mapped-types'
import { CreateHeelStyleDto } from './create-heel-style.dto'

export class UpdateHeelStyleDto extends PartialType(CreateHeelStyleDto) {}
