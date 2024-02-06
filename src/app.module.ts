import { Module } from '@nestjs/common';
import { CrocodileGateway } from './crocodile.gateway';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot()
  ],
  providers: [CrocodileGateway],
})
export class AppModule {}
 