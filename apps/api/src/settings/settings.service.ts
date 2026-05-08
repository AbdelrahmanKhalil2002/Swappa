import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

const DEFAULTS: Record<string, string> = {
  low_stock_threshold: '5',
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string): Promise<string> {
    const row = await this.prisma.appSetting.findUnique({ where: { key } })
    return row?.value ?? DEFAULTS[key] ?? ''
  }

  async set(key: string, value: string) {
    return this.prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  }

  async getAll() {
    const rows = await this.prisma.appSetting.findMany()
    const map: Record<string, string> = { ...DEFAULTS }
    for (const row of rows) map[row.key] = row.value
    return map
  }

  async setMany(entries: Record<string, string>) {
    await Promise.all(Object.entries(entries).map(([k, v]) => this.set(k, v)))
    return this.getAll()
  }

  async getLowStockThreshold(): Promise<number> {
    const val = await this.get('low_stock_threshold')
    return parseInt(val, 10) || 5
  }
}
