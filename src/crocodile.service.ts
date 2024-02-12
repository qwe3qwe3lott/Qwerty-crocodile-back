import { Injectable } from '@nestjs/common';
import { Room } from './crocodile.room.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CrocodileService {
	readonly rooms: Map<string, Room> = new Map();
	readonly emptyRoomChecks: WeakMap<Room, number> = new WeakMap();

	@Cron(CronExpression.EVERY_10_MINUTES)
	handleCron() {
		for (const [ roomId,room ] of this.rooms) {
			if (!room.isEmpty) continue;

			const count = (this.emptyRoomChecks.get(room) ?? 0) + 1;

			if (count >= 3) {
				room.destroy();

				this.rooms.delete(roomId);
			} else this.emptyRoomChecks.set(room, count);
		}
	}

	public getRoom(roomId: string): Room | null {
		return this.rooms.get(roomId) ?? null;
	}

	public createRoom(): Room {
		const roomId = uuidv4();

		const room = new Room(roomId);

		this.rooms.set(roomId, room);
		this.emptyRoomChecks.set(room, 0);

		return room;
	}
}