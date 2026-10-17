import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret-change-me',
    });
  }

  async validate(payload: { sub: string; username: string }) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, name: true, isActive: true },
    });

    if (!staff || !staff.isActive) {
      throw new UnauthorizedException('Sesi tidak valid atau akun tidak aktif');
    }

    return staff;
  }
}
