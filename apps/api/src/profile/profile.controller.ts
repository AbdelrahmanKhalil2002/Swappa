import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common'
import { CustomerJwtGuard } from '../auth/guards/customer-jwt.guard'
import { ProfileService } from './profile.service'
import { UpdateSizeProfileDto } from './dto/update-size-profile.dto'

@Controller('profile')
@UseGuards(CustomerJwtGuard)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get('me')
  getMe(@Req() req: { user: { id: string } }) {
    return this.profile.getMe(req.user.id)
  }

  @Patch('me/size')
  updateSize(@Req() req: { user: { id: string } }, @Body() dto: UpdateSizeProfileDto) {
    return this.profile.updateSizeProfile(req.user.id, dto)
  }
}
