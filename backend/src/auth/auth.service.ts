import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    const staff = await this.prisma.staff.findUnique({
      where: { username },
    });

    if (!staff) {
      throw new UnauthorizedException('Username atau password salah');
    }

    if (!staff.isActive) {
      throw new UnauthorizedException('Akun petugas tidak aktif');
    }

    const isPasswordValid = await bcrypt.compare(password, staff.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Username atau password salah');
    }

    const payload = { sub: staff.id, username: staff.username };
    const token = this.jwtService.sign(payload);

    return {
      accessToken: token,
      staff: {
        id: staff.id,
        username: staff.username,
        name: staff.name,
      },
    };
  }

  async getMe(staffId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        username: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!staff || !staff.isActive) {
      throw new UnauthorizedException('Akun tidak ditemukan atau tidak aktif');
    }

    return staff;
  }
}
