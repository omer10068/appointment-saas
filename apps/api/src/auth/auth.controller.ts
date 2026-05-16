import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from './types/authenticated-request';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(ClerkAuthGuard)
  getMe(@Req() req: AuthenticatedRequest) {
    const { id, email, platformRole, status } = req.user;
    return { id, email, platformRole, status };
  }
}
