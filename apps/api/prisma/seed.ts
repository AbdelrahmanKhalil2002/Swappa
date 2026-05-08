import { PrismaClient, AdminModule, AdminAction } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const ALL_MODULES = Object.values(AdminModule)
const ALL_ACTIONS = Object.values(AdminAction)

async function main() {
  console.log('🌱 Starting seed...')

  // Create superadmin role with ALL permissions
  const superadminRole = await prisma.role.upsert({
    where: { name: 'superadmin' },
    update: {},
    create: {
      name: 'superadmin',
      description: 'Full access to all modules and actions',
      isSystem: true,
      permissions: {
        create: ALL_MODULES.flatMap((module) =>
          ALL_ACTIONS.map((action) => ({ module, action })),
        ),
      },
    },
  })
  console.log(`✅ Role created/found: ${superadminRole.name} (${superadminRole.id})`)

  // Create inventory_manager role as example secondary role
  const inventoryManagerRole = await prisma.role.upsert({
    where: { name: 'inventory_manager' },
    update: {},
    create: {
      name: 'inventory_manager',
      description: 'Manages inventory and raw materials',
      isSystem: false,
      permissions: {
        create: [
          { module: AdminModule.INVENTORY, action: AdminAction.READ },
          { module: AdminModule.INVENTORY, action: AdminAction.WRITE },
          { module: AdminModule.RAW_MATERIALS, action: AdminAction.READ },
          { module: AdminModule.RAW_MATERIALS, action: AdminAction.WRITE },
          { module: AdminModule.DASHBOARD, action: AdminAction.READ },
          { module: AdminModule.ANALYTICS, action: AdminAction.READ },
        ],
      },
    },
  })
  console.log(`✅ Role created/found: ${inventoryManagerRole.name} (${inventoryManagerRole.id})`)

  // Create superadmin user if no admin user exists
  const existingAdminCount = await prisma.adminUser.count()

  if (existingAdminCount === 0) {
    const email = process.env.SUPERADMIN_EMAIL ?? 'admin@antigravity.com'
    const password = process.env.SUPERADMIN_PASSWORD ?? 'Admin@123456!'
    const hashedPassword = await bcrypt.hash(password, 12)

    const superadminUser = await prisma.adminUser.create({
      data: {
        email,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        isActive: true,
        roleId: superadminRole.id,
      },
    })
    console.log(`✅ Superadmin user created: ${superadminUser.email} (${superadminUser.id})`)
  } else {
    console.log(`ℹ️  Admin users already exist (${existingAdminCount}), skipping superadmin creation`)
  }

  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
