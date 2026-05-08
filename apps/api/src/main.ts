import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true })

  const uploadsDir = join(process.cwd(), 'uploads')
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' })

  app.use(cookieParser())

  app.setGlobalPrefix('api/v1')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  )

  app.enableCors({
    origin: [
      process.env.STOREFRONT_URL ?? 'http://localhost:3000',
      process.env.ADMIN_URL ?? 'http://localhost:3001',
      process.env.FACTORY_URL ?? 'http://localhost:3002',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  const port = process.env.PORT ?? 4000
  await app.listen(port)
  console.log(`\n🚀 API running at http://localhost:${port}/api/v1`)
  console.log(`   Health: http://localhost:${port}/api/v1/health\n`)
}

bootstrap()
