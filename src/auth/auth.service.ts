import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { hashPassword, verifyPassword } from './password.js';
import { AccessTokenPayload, AuthUser, RefreshTokenPayload } from './auth.types.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('El correo ya está registrado');
    }
    const user = await this.prisma.user.create({
      data: { name: dto.name.trim(), email, passwordHash: await hashPassword(dto.password) },
    });
    return this.issueTokens({ id: user.id, email: user.email, name: user.name });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.issueTokens({ id: user.id, email: user.email, name: user.name });
  }

  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.expiresAt < new Date() || stored.userId !== payload.sub) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    return this.issueTokens({ id: user.id, email: user.email, name: user.name });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: this.hashToken(refreshToken) } });
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { id: user.id, email: user.email, name: user.name };
  }

  private async issueTokens(user: AuthUser) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, type: 'access' } satisfies AccessTokenPayload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'development-access-secret',
      expiresIn: 900,
    });
    const jti = randomUUID();
    const refreshToken = await this.jwt.signAsync({ sub: user.id, type: 'refresh', jti } satisfies RefreshTokenPayload, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'development-refresh-secret',
      expiresIn: 604800,
    });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({ data: { tokenHash: this.hashToken(refreshToken), userId: user.id, expiresAt } });
    return { user, accessToken, refreshToken, expiresIn: 900 };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
