import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { BulkUpdateCompatibilityDto, CompatibilityItemDto } from './dto/update-compatibility.dto'

@Injectable()
export class CompatibilityService {
  constructor(private readonly prisma: PrismaService) {}

  // Returns all heel styles with their compatibility status for a given shoe.
  // Heel styles without an explicit record are treated as not yet assessed.
  async findForShoe(shoeId: string) {
    const shoe = await this.prisma.baseShoe.findUnique({ where: { id: shoeId } })
    if (!shoe) throw new NotFoundException('Shoe not found')

    const [allHeels, records] = await Promise.all([
      this.prisma.heelStyle.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.heelCompatibility.findMany({ where: { baseShoeId: shoeId } }),
    ])

    const recordMap = new Map(records.map((r) => [r.heelStyleId, r]))

    return allHeels.map((heel) => {
      const record = recordMap.get(heel.id)
      return {
        heelStyleId: heel.id,
        heelStyle: heel,
        isCompatible: record?.isCompatible ?? null,
        notes: record?.notes ?? null,
        recordId: record?.id ?? null,
      }
    })
  }

  // Toggle / upsert a single heel–shoe compatibility entry.
  upsertOne(shoeId: string, item: CompatibilityItemDto) {
    return this.prisma.heelCompatibility.upsert({
      where: { baseShoeId_heelStyleId: { baseShoeId: shoeId, heelStyleId: item.heelStyleId } },
      create: {
        baseShoeId: shoeId,
        heelStyleId: item.heelStyleId,
        isCompatible: item.isCompatible,
        notes: item.notes,
      },
      update: { isCompatible: item.isCompatible, notes: item.notes },
    })
  }

  // Batch upsert: update only the items provided.
  async bulkUpdate(shoeId: string, dto: BulkUpdateCompatibilityDto) {
    const ops = dto.items.map((item) => this.upsertOne(shoeId, item))
    return Promise.all(ops)
  }

  // Bulk-enable: marks every heel style as compatible with this shoe.
  // Creates missing records; updates existing ones. Existing notes are preserved.
  async bulkEnable(shoeId: string) {
    const shoe = await this.prisma.baseShoe.findUnique({ where: { id: shoeId } })
    if (!shoe) throw new NotFoundException('Shoe not found')

    const heels = await this.prisma.heelStyle.findMany({ select: { id: true } })
    const ops = heels.map((heel) =>
      this.prisma.heelCompatibility.upsert({
        where: { baseShoeId_heelStyleId: { baseShoeId: shoeId, heelStyleId: heel.id } },
        create: { baseShoeId: shoeId, heelStyleId: heel.id, isCompatible: true },
        update: { isCompatible: true },
      }),
    )
    await Promise.all(ops)
    return { updated: heels.length }
  }
}
