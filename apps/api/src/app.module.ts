import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { PrismaModule } from './prisma/prisma.module'
import { MailModule } from './mail/mail.module'
import { AuthModule } from './auth/auth.module'
import { CatalogModule } from './catalog/catalog.module'
import { MediaModule } from './media/media.module'
import { ProfileModule } from './profile/profile.module'
import { CheckoutModule } from './checkout/checkout.module'
import { OrdersModule } from './orders/orders.module'
import { WebhooksModule } from './webhooks/webhooks.module'
import { InventoryModule } from './inventory/inventory.module'
import { SettingsModule } from './settings/settings.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    CatalogModule,
    MediaModule,
    ProfileModule,
    CheckoutModule,
    OrdersModule,
    WebhooksModule,
    InventoryModule,
    SettingsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
