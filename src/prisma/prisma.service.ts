import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DEMO_USER_ID } from '../common/demo-user.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ datasources: { db: { url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db' } } });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.user.upsert({
      where: { id: DEMO_USER_ID },
      update: {},
      create: {
        id: DEMO_USER_ID,
        name: 'Smart Feeder Demo',
        email: 'demo@smart-feeder.local',
        passwordHash: 'not-used-in-demo-mode',
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
