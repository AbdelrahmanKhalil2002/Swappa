import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, ProductionOrderStatus, QCStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { BomService } from '../raw-materials/bom.service'
import { SettingsService } from '../settings/settings.service'
import { CreateProductionOrderDto } from './dto/create-production-order.dto'
import { AdvanceStageDto } from './dto/advance-stage.dto'
import { SubmitQCDto } from './dto/submit-qc.dto'
import { ReviewQCDto } from './dto/review-qc.dto'

const ORDER_INCLUDE = {
  variant: {
    include: {
      baseShoe: { select: { id: true, name: true, slug: true } },
    },
  },
  stageLogs: {
    include: { worker: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  qcInspections: { orderBy: { createdAt: 'desc' as const } },
}

@Injectable()
export class ManufacturingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bom: BomService,
    private readonly settings: SettingsService,
  ) {}

  async findAll({
    page = 1,
    limit = 30,
    status,
  }: {
    page?: number
    limit?: number
    status?: ProductionOrderStatus
  }) {
    const where: Prisma.ProductionOrderWhereInput = status ? { status } : {}
    const [items, total] = await Promise.all([
      this.prisma.productionOrder.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.productionOrder.count({ where }),
    ])
    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async findOne(id: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    })
    if (!order) throw new NotFoundException('Production order not found')
    return order
  }

  async create(dto: CreateProductionOrderDto, createdById?: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { baseShoe: { select: { name: true } } },
    })
    if (!variant) throw new NotFoundException('Variant not found')

    const materialCost = await this.bom.calculateCost(dto.variantId)
    const stages = await this.settings.getProductionStages()

    const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`

    return this.prisma.productionOrder.create({
      data: {
        orderNumber,
        variantId: dto.variantId,
        quantity: dto.quantity,
        overheadCostPerUnit: dto.overheadCostPerUnit
          ? new Prisma.Decimal(dto.overheadCostPerUnit)
          : new Prisma.Decimal(0),
        materialCostPerUnit: new Prisma.Decimal(materialCost),
        currentStage: stages[0] ?? null,
        notes: dto.notes,
        createdById,
        // Create a pending QC inspection
        qcInspections: { create: {} },
      },
      include: ORDER_INCLUDE,
    })
  }

  async advanceStage(id: string, dto: AdvanceStageDto, workerId?: string) {
    const order = await this.findOne(id)
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot advance a completed or cancelled order')
    }

    const stages = await this.settings.getProductionStages()
    const stageIdx = stages.indexOf(dto.stage)
    if (stageIdx === -1) throw new BadRequestException(`Unknown stage: ${dto.stage}`)

    const isLastStage = stageIdx === stages.length - 1
    const nextStatus: ProductionOrderStatus = isLastStage ? 'QC_PENDING' : 'IN_PROGRESS'
    const nextStage = isLastStage ? dto.stage : stages[stageIdx + 1]

    await this.prisma.productionStageLog.create({
      data: {
        productionOrderId: id,
        stage: dto.stage,
        unitsCompleted: dto.unitsCompleted,
        notes: dto.notes,
        workerId,
      },
    })

    return this.prisma.productionOrder.update({
      where: { id },
      data: {
        status: nextStatus,
        currentStage: nextStage,
      },
      include: ORDER_INCLUDE,
    })
  }

  async submitQC(id: string, dto: SubmitQCDto, submittedById?: string) {
    const order = await this.findOne(id)
    if (order.status !== 'QC_PENDING' && order.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Order is not ready for QC')
    }

    const qc = order.qcInspections.find((i) => i.status === 'PENDING')
    if (!qc) throw new NotFoundException('No pending QC inspection found')

    await this.prisma.qCInspection.update({
      where: { id: qc.id },
      data: {
        status: QCStatus.SUBMITTED,
        checklistResults: dto.checklistResults,
        defectNotes: dto.defectNotes,
        defectPhotoUrls: dto.defectPhotoUrls ?? [],
        submittedById,
      },
    })

    return this.prisma.productionOrder.update({
      where: { id },
      data: { status: ProductionOrderStatus.QC_PENDING },
      include: ORDER_INCLUDE,
    })
  }

  async reviewQC(id: string, dto: ReviewQCDto, reviewedById?: string) {
    const order = await this.findOne(id)
    if (order.status !== 'QC_PENDING') {
      throw new BadRequestException('Order is not awaiting QC review')
    }

    const qc = order.qcInspections.find((i) => i.status === 'SUBMITTED')
    if (!qc) throw new NotFoundException('No submitted QC inspection to review')

    if (dto.decision === 'APPROVED') {
      await this.prisma.qCInspection.update({
        where: { id: qc.id },
        data: { status: QCStatus.APPROVED, reviewedById },
      })
      return this.prisma.productionOrder.update({
        where: { id },
        data: { status: ProductionOrderStatus.COMPLETED },
        include: ORDER_INCLUDE,
      })
    } else {
      if (!dto.rejectionReason) throw new BadRequestException('Rejection reason is required')
      await this.prisma.qCInspection.update({
        where: { id: qc.id },
        data: {
          status: QCStatus.REJECTED,
          reviewedById,
          rejectionReason: dto.rejectionReason,
        },
      })
      // Create a fresh PENDING QC for re-inspection
      await this.prisma.qCInspection.create({
        data: { productionOrderId: id },
      })
      return this.prisma.productionOrder.update({
        where: { id },
        data: { status: ProductionOrderStatus.QC_REJECTED },
        include: ORDER_INCLUDE,
      })
    }
  }

  async cancel(id: string) {
    const order = await this.findOne(id)
    if (order.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed order')
    }
    return this.prisma.productionOrder.update({
      where: { id },
      data: { status: ProductionOrderStatus.CANCELLED },
      include: ORDER_INCLUDE,
    })
  }
}
