import { Module } from '@nestjs/common';
import { CrocodileGateway } from './crocodile.gateway';

@Module({
	providers: [CrocodileGateway],
})
export class AppModule {}
 