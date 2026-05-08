import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { AdminModule, AdminAction } from '@prisma/client'

interface Permission {
  module: AdminModule
  action: AdminAction
}

interface AdminUserWithPermissions {
  permissions: Permission[]
}

const PERMISSIONS_KEY = 'permissions'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!required || required.length === 0) {
      return true
    }

    const { user } = context.switchToHttp().getRequest<{ user: AdminUserWithPermissions }>()

    if (!user || !user.permissions) {
      throw new ForbiddenException('Insufficient permissions')
    }

    const hasAll = required.every((req) =>
      user.permissions.some((p) => p.module === req.module && p.action === req.action),
    )

    if (!hasAll) {
      throw new ForbiddenException('Insufficient permissions')
    }

    return true
  }
}
