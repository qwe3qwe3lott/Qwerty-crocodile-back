import { DrawEvent, User } from './crocodile.entity';
import { Emitter } from './crocodile.emitter';
import { Canvas, CanvasRenderingContext2D } from 'canvas';

export type RoomEventPayloadMap = {
	userJoined: User;
	userLeaved: User;
	ownerId: string;
	drawEvents: { drawEvents: DrawEvent[], authorId: string };
};

export type RoomEvent = keyof RoomEventPayloadMap;

export class Room {
	static readonly WIDTH = 100;
	static readonly HEIGHT = 141;

	public readonly id: string;
	private readonly users: Map<string, User> = new Map();
	private ownerId: string;

	private readonly emitter: Emitter<RoomEvent, RoomEventPayloadMap> = new Emitter();

	private canvas: Canvas = new Canvas(Room.WIDTH, Room.HEIGHT, 'image');
	private get canvasCtx(): CanvasRenderingContext2D {
		return this.canvas.getContext('2d');
	}

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

	public draw(drawEvents: DrawEvent[], authorId: string) {
		for (const drawEvent of drawEvents) {
			switch (drawEvent.type) {
				case 'line':
					this.canvasCtx.strokeStyle = drawEvent.color;
					this.canvasCtx.lineWidth = drawEvent.width;
					this.canvasCtx.lineCap = 'round';
					this.canvasCtx.beginPath();
					this.canvasCtx.moveTo(drawEvent.x1, drawEvent.y1);
					this.canvasCtx.lineTo(drawEvent.x2, drawEvent.y2);
					this.canvasCtx.stroke();
					break;
				case 'path':
					this.canvasCtx.strokeStyle = drawEvent.color;
					this.canvasCtx.lineWidth = drawEvent.width;
					this.canvasCtx.lineCap = 'round';
					this.canvasCtx.beginPath();
					drawEvent.nodes[0] && this.canvasCtx.moveTo(drawEvent.nodes[0].x, drawEvent.nodes[0].y);
					for (let i = 1; i < drawEvent.nodes.length; i++) {
						this.canvasCtx.lineTo(drawEvent.nodes[i].x, drawEvent.nodes[i].y);
					}
					this.canvasCtx.stroke();
					break;
				case 'fill':
					this.canvasCtx.fillStyle = drawEvent.color;
					this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
					break;
			}
		}

		this.emitter.emit('drawEvents', { drawEvents, authorId });
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
