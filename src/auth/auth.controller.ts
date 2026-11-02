import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { apiData } from '../common/api-response.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}
  @Post('register') register(@Body() dto: RegisterDto) { return this.service.register(dto).then(apiData); }
  @Post('login') login(@Body() dto: LoginDto) { return this.service.login(dto).then(apiData); }
  @Post('refresh') refresh(@Body() dto: RefreshDto) { return this.service.refresh(dto.refreshToken).then(apiData); }
  @Post('logout') async logout(@Body() dto: RefreshDto) { await this.service.logout(dto.refreshToken); return apiData({ success: true }); }
  @UseGuards(JwtAuthGuard)
  @Get('me') me(@CurrentUser() user: { id: string }) { return this.service.me(user.id).then(apiData); }
}
