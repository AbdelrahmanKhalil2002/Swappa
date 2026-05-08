import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class FactoryJwtGuard extends AuthGuard('factory-jwt') {}
