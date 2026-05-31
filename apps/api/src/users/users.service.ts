import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
      phoneVerifiedAt: user.phoneVerifiedAt,
      createdAt: user.createdAt,
      profile: user.profile,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.email) {
      const conflict = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: userId } },
      });
      if (conflict) {
        throw new ConflictException('Email already in use');
      }
    }

    const user = await this.prisma.$transaction(async (tx) => {
      if (dto.email) {
        await tx.user.update({
          where: { id: userId },
          data: { email: dto.email },
        });
      }

      const profile = await tx.userProfile.findUnique({ where: { userId } });
      if (!profile) {
        throw new NotFoundException('Profile not found. Complete registration.');
      }

      await tx.userProfile.update({
        where: { userId },
        data: {
          fullName: dto.fullName,
          avatarUrl: dto.avatarUrl,
          state: dto.state,
          district: dto.district,
          pincode: dto.pincode,
          businessName: dto.businessName,
          bio: dto.bio,
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: { profile: true },
      });
    });

    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
      profile: user.profile,
    };
  }
}
