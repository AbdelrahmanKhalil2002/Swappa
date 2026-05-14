import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, PurchaseOrderStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { RawMaterialsService } from '../raw-materials/raw-materials.service'
import { SupplierAuthService } from '../auth/supplier/supplier-auth.service'
import { CreateSupplierDto } from './dto/create-supplier.dto'
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto'
import { ReconcileGRDto } from './dto/reconcile-gr.dto'

const SUPPLIER_SAFE = {
  id: true, name: true, code: true, contactName: true, contactEmail: true,
  contactPhone: true, website: true, paymentTerms: true, notes: true,
  isActive: true, createdAt: true, updatedAt: true,
}

const PO_INCLUDE = {
  supplier: { select: { id: true, name: true, code: true, contactEmail: true } },
  lines: {
    include: { material: { select: { id: true, name: true, sku: true, unit: true } } },
  },
  goodsReceipts: {
    include: {
      lines: {
        include: { material: { select: { id: true, name: true, sku: true, unit: true } } },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
}

@Injectable()
export class ProcurementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rawMaterials: RawMaterialsService,
    private readonly supplierAuth: SupplierAuthService,
  ) {}

  // ── Suppliers ──────────────────────────────────────────────────────────────

  async findAllSuppliers({ page = 1, limit = 30 }: { page?: number; limit?: number }) {
    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        select: { ...SUPPLIER_SAFE, _count: { select: { purchaseOrders: true } } },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supplier.count(),
    ])
    return { items, total, page, pages: Math.ceil(total / limit) }
  }

  async findSupplier(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      select: { ...SUPPLIER_SAFE },
    })
    if (!supplier) throw new NotFoundException('Supplier not found')
    return supplier
  }

  async createSupplier(dto: CreateSupplierDto) {
    const supplier = await this.prisma.supplier.create({
      data: { ...dto },
      select: SUPPLIER_SAFE,
    })
    // Generate invite token immediately
    const inviteToken = await this.supplierAuth.generateInviteToken(supplier.id)
    return { supplier, inviteToken }
  }

  async updateSupplier(id: string, dto: Partial<CreateSupplierDto>) {
    await this.findSupplier(id)
    return this.prisma.supplier.update({
      where: { id },
      data: dto,
      select: SUPPLIER_SAFE,
    })
  }

  async regenerateInvite(id: string) {
    await this.findSupplier(id)
    const inviteToken = await this.supplierAuth.generateInviteToken(id)
    return { inviteToken }
  }

  async getSupplierPerformance(id: string) {
    await this.findSupplier(id)

    const orders = await this.prisma.purchaseOrder.findMany({
      where: { supplierId: id, status: { not: 'CANCELLED' } },
      include: {
        goodsReceipts: { where: { status: 'CONFIRMED' }, select: { confirmedAt: true } },
        lines: { select: { quantityOrdered: true, unitCost: true } },
      },
    })

    const total = orders.length
    let onTimeCount = 0
    let totalDeliveryDays = 0
    let deliveryCount = 0
    let totalSpend = 0

    for (const po of orders) {
      // Total spend
      for (const line of po.lines) {
        totalSpend += Number(line.quantityOrdered) * Number(line.unitCost)
      }

      // Delivery metrics
      const gr = po.goodsReceipts[0]
      if (gr?.confirmedAt && po.expectedDeliveryDate) {
        const days = Math.round(
          (gr.confirmedAt.getTime() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24),
        )
        totalDeliveryDays += days
        deliveryCount++
        if (gr.confirmedAt <= po.expectedDeliveryDate) onTimeCount++
      }
    }

    return {
      totalOrders: total,
      onTimeRate: deliveryCount > 0 ? Math.round((onTimeCount / deliveryCount) * 100) : null,
      avgDeliveryDays: deliveryCount > 0 ? Math.round(totalDeliveryDays / deliveryCount) : null,
      totalSpend: Math.round(totalSpend * 100) / 100,
    }
  }

  async getMaterialCostComparison(materialId: string) {
    const lines = await this.prisma.purchaseOrderLine.findMany({
      where: { materialId },
      include: {
        purchaseOrder: {
          select: { createdAt: true, supplier: { select: { id: true, name: true, code: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return lines.map((l) => ({
      supplierId: l.purchaseOrder.supplier.id,
      supplierName: l.purchaseOrder.supplier.name,
      supplierCode: l.purchaseOrder.supplier.code,
      unitCost: Number(l.unitCost),
      date: l.purchaseOrder.createdAt,
    }))
  }

  // ── Purchase Orders ────────────────────────────────────────────────────────

  async findAllPOs({
    page = 1,
    limit = 30,
    supplierId,
    status,
  }: {
    page?: number
    limit?: number
    supplierId?: string
    status?: PurchaseOrderStatus
  }) {
    const where: Prisma.PurchaseOrderWhereInput = {}
    if (supplierId) where.supplierId = supplierId
    if (status) where.status = status

    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: PO_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ])
    return { items, total, page, pages: Math.ceil(total / limit) }
  }

  async findOnePO(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: PO_INCLUDE })
    if (!po) throw new NotFoundException('Purchase order not found')
    return po
  }

  async createPO(dto: CreatePurchaseOrderDto, createdById?: string) {
    const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`
    return this.prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: dto.supplierId,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : undefined,
        notes: dto.notes,
        createdById,
        lines: {
          create: dto.lines.map((l) => ({
            materialId: l.materialId,
            quantityOrdered: new Prisma.Decimal(l.quantityOrdered),
            unitCost: new Prisma.Decimal(l.unitCost),
          })),
        },
      },
      include: PO_INCLUDE,
    })
  }

  async updatePOStatus(id: string, status: PurchaseOrderStatus) {
    await this.findOnePO(id)
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status }, include: PO_INCLUDE })
  }

  async updatePODeliveryDate(id: string, date: string) {
    await this.findOnePO(id)
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { expectedDeliveryDate: new Date(date) },
      include: PO_INCLUDE,
    })
  }

  // ── Goods Receipts ─────────────────────────────────────────────────────────

  async createGR(poId: string) {
    const po = await this.findOnePO(poId)
    if (po.status === 'CANCELLED') throw new BadRequestException('Cannot receive a cancelled PO')

    return this.prisma.goodsReceipt.create({
      data: {
        purchaseOrderId: poId,
        lines: {
          create: po.lines.map((l) => ({
            purchaseOrderLineId: l.id,
            materialId: l.materialId,
            quantityExpected: l.quantityOrdered,
            quantityReceived: 0,
            unitCost: l.unitCost,
          })),
        },
      },
      include: {
        lines: {
          include: { material: { select: { id: true, name: true, sku: true, unit: true } } },
        },
      },
    })
  }

  async reconcileGR(grId: string, dto: ReconcileGRDto) {
    const gr = await this.prisma.goodsReceipt.findUnique({
      where: { id: grId },
      include: { lines: true },
    })
    if (!gr) throw new NotFoundException('Goods receipt not found')
    if (gr.status === 'CONFIRMED') throw new BadRequestException('Already confirmed')

    await Promise.all(
      dto.lines.map((l) =>
        this.prisma.goodsReceiptLine.updateMany({
          where: { goodsReceiptId: grId, purchaseOrderLineId: l.purchaseOrderLineId },
          data: {
            quantityReceived: new Prisma.Decimal(l.quantityReceived),
            hasShortage: l.hasShortage ?? l.quantityReceived < Number(
              gr.lines.find((gl) => gl.purchaseOrderLineId === l.purchaseOrderLineId)?.quantityExpected ?? 0,
            ),
            shortageNotes: l.shortageNotes,
          },
        }),
      ),
    )

    return this.prisma.goodsReceipt.update({
      where: { id: grId },
      data: { status: 'RECONCILED', notes: dto.notes },
      include: {
        lines: {
          include: { material: { select: { id: true, name: true, sku: true, unit: true } } },
        },
      },
    })
  }

  async confirmGR(grId: string, confirmedById?: string) {
    const gr = await this.prisma.goodsReceipt.findUnique({
      where: { id: grId },
      include: {
        lines: { include: { material: true } },
        purchaseOrder: true,
      },
    })
    if (!gr) throw new NotFoundException('Goods receipt not found')
    if (gr.status !== 'RECONCILED') throw new BadRequestException('Reconcile first before confirming')

    // Update stock for each received line via RawMaterialsService
    for (const line of gr.lines) {
      const qty = Number(line.quantityReceived)
      if (qty > 0) {
        await this.rawMaterials.receive(
          line.materialId,
          { quantity: qty, costPerUnit: Number(line.unitCost), reference: gr.purchaseOrder.orderNumber },
          confirmedById ?? 'system',
        )
      }
    }

    // Derive new PO status
    const allLines = await this.prisma.goodsReceiptLine.findMany({
      where: { goodsReceipt: { purchaseOrderId: gr.purchaseOrderId } },
    })
    const poLines = await this.prisma.purchaseOrderLine.findMany({
      where: { purchaseOrderId: gr.purchaseOrderId },
    })
    const totalOrdered = poLines.reduce((s, l) => s + Number(l.quantityOrdered), 0)
    const totalReceived = allLines
      .filter((l) => l.goodsReceiptId === grId)
      .reduce((s, l) => s + Number(l.quantityReceived), 0)

    const newPoStatus: PurchaseOrderStatus =
      totalReceived >= totalOrdered ? 'RECEIVED' : 'PARTIALLY_RECEIVED'

    await this.prisma.purchaseOrder.update({
      where: { id: gr.purchaseOrderId },
      data: { status: newPoStatus },
    })

    return this.prisma.goodsReceipt.update({
      where: { id: grId },
      data: { status: 'CONFIRMED', confirmedById, confirmedAt: new Date() },
      include: {
        lines: {
          include: { material: { select: { id: true, name: true, sku: true, unit: true } } },
        },
      },
    })
  }

  // ── Supplier Portal ────────────────────────────────────────────────────────

  async getPortalPOs(supplierId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { supplierId, status: { notIn: ['CANCELLED'] } },
      include: {
        lines: {
          include: { material: { select: { id: true, name: true, sku: true, unit: true } } },
        },
        goodsReceipts: { select: { id: true, status: true, confirmedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async portalUpdateDeliveryDate(poId: string, supplierId: string, date: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, supplierId },
    })
    if (!po) throw new NotFoundException('Purchase order not found')
    if (po.status === 'CANCELLED' || po.status === 'RECEIVED') {
      throw new BadRequestException('Cannot update delivery date on this PO')
    }
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: { expectedDeliveryDate: new Date(date) },
    })
  }

  async portalUploadDocument(
    supplierId: string,
    poId: string | undefined,
    file: { name: string; url: string; key: string; docType?: string },
  ) {
    return this.prisma.supplierDocument.create({
      data: {
        supplierId,
        poId,
        name: file.name,
        url: file.url,
        key: file.key,
        docType: file.docType ?? 'GENERAL',
      },
    })
  }

  async getSupplierDocuments(supplierId: string) {
    return this.prisma.supplierDocument.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
    })
  }
}
