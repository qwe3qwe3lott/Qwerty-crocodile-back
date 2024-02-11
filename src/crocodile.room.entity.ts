import { User } from './crocodile.entity';
import { Emitter } from './crocodile.emitter';

export type RoomEventPayloadMap = {
	userJoined: User;
	userLeaved: User;
	ownerId: string;
};

export type RoomEvent = keyof RoomEventPayloadMap;

export class Room {
	public readonly id: string;
	private readonly users: Map<string, User> = new Map();
	private ownerId: string;
	private readonly emitter: Emitter<RoomEvent, RoomEventPayloadMap> = new Emitter();

	constructor(id: string) {
		this.id = id;
	}

	public on<Event extends RoomEvent = RoomEvent>(event: Event, callback: (payload: RoomEventPayloadMap[Event]) => void): () => void {
		return this.emitter.subscribe(event, callback);
	}

	public join(user: User): void {
		this.users.set(user.id, user);

		this.emitter.emit('userJoined', user);

		if (!this.ownerId) {
			this.ownerId = user.id;

			this.emitter.emit('ownerId', user.id);
		}
	}

	public leave(userId: string): boolean {
		const user = this.users.get(userId);

		if (!user) return false;

		this.users.delete(userId);

		this.emitter.emit('userLeaved', user);

		if (userId === this.ownerId) {
			if (this.users.size === 0) {
				this.ownerId = '';
			} else {
				const userIds = Array.from(this.users.keys());

				this.ownerId = userIds[Math.floor(Math.random() * userIds.length)];
			}

			this.emitter.emit('ownerId', this.ownerId);
		}

		return true;
	}

	public isEmpty(): boolean {
		return this.users.size === 0;
	}

	public hasUser(userId: string): boolean {
		return this.users.has(userId);
	}

	public getUsers(): User[] {
		return Array.from(this.users, ([ , user ]) => ({ ...user }));
	}

	public getOwnerId(): string {
		return this.ownerId;
	}

	public destroy(): void {
		this.emitter.unsubscribeAll();
	}
}
