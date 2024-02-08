import { Module } from '@nestjs/common';
import { CrocodileGateway } from './crocodile.gateway';
import { ScheduleModule } from '@nestjs/schedule';
import { CrocodileService } from './crocodile.service';

@Module({
	imports: [
		ScheduleModule.forRoot()
	],
	providers: [ CrocodileGateway, CrocodileService ],
})
export class AppModule {}
