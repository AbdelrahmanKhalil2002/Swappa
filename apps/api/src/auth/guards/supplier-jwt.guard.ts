import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class SupplierJwtGuard extends AuthGuard('supplier-jwt') {}
