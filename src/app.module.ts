import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { FeedersModule } from './feeders/feeders.module.js';
import { PetsModule } from './pets/pets.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { FeedingEventsModule } from './feeding-events/feeding-events.module.js';
import { AlertsModule } from './alerts/alerts.module.js';
import { FoodsModule } from './foods/foods.module.js';
import { DevicesModule } from './devices/devices.module.js';
import { CameraModule } from './camera/camera.module.js';
import { SchedulerModule } from './scheduler/scheduler.module.js';

@Module({
  imports: [PrismaModule, PetsModule, FeedersModule, FeedingEventsModule, AlertsModule, FoodsModule, DevicesModule, CameraModule, SchedulerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
