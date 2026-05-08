import { SetMetadata } from '@nestjs/common'
import type { AdminModule, AdminAction } from '@prisma/client'

export interface Permission {
  module: AdminModule
  action: AdminAction
}

export const RequirePermissions = (...perms: Permission[]) => SetMetadata('permissions', perms)
