import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { UpdateSizeProfileDto } from './dto/update-size-profile.dto'

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  getMe(customerId: string) {
    return this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        footLengthMm: true,
        footWidthMm: true,
        createdAt: true,
      },
    })
  }

  updateSizeProfile(customerId: string, dto: UpdateSizeProfileDto) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: dto,
      select: {
        id: true,
        footLengthMm: true,
        footWidthMm: true,
      },
    })
  }
}
