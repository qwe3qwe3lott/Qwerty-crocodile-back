import { DrawEvent, User } from './crocodile.entity';
import { Emitter } from './crocodile.emitter';
import { Canvas, CanvasRenderingContext2D, ImageData } from 'canvas';

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

	public readonly _id: string;
	private readonly _users: Map<string, User> = new Map();
	private _ownerId: string;

	private readonly emitter: Emitter<RoomEvent, RoomEventPayloadMap> = new Emitter();

	private canvas: Canvas = new Canvas(Room.WIDTH, Room.HEIGHT, 'image');
	private get canvasCtx(): CanvasRenderingContext2D {
		return this.canvas.getContext('2d');
	}

	public get isEmpty(): boolean {
		return this._users.size === 0;
	}

	public get users(): User[] {
		return Array.from(this._users, ([ , user ]) => ({ ...user }));
	}

	public get ownerId(): string {
		return this._ownerId;
	}

	public get id(): string {
		return this._id;
	}

	public get canvasImageData(): { data: ArrayBuffer, height: number, width: number } {
		return {
			data: this.canvas.getContext('2d').getImageData(0, 0, this.canvas.width, this.canvas.height).data,
			width: this.canvas.width,
			height: this.canvas.height
		};
	}

	constructor(id: string) {
		this._id = id;

		this.canvasCtx.fillStyle = 'white';
		this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
	}

	public on<Event extends RoomEvent = RoomEvent>(event: Event, callback: (payload: RoomEventPayloadMap[Event]) => void): () => void {
		return this.emitter.subscribe(event, callback);
	}

	public join(user: User): void {
		this._users.set(user.id, user);

		this.emitter.emit('userJoined', user);

		if (!this.ownerId) {
			this._ownerId = user.id;

			this.emitter.emit('ownerId', user.id);
		}
	}

	public leave(userId: string): boolean {
		const user = this._users.get(userId);

		if (!user) return false;

		this._users.delete(userId);

		this.emitter.emit('userLeaved', user);

		if (userId === this.ownerId) {
			if (this._users.size === 0) {
				this._ownerId = '';
			} else {
				const userIds = Array.from(this._users.keys());

				this._ownerId = userIds[Math.floor(Math.random() * userIds.length)];
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
				case 'image': {
					const buffer = new Uint8ClampedArray(drawEvent.data);
					const imageData = new ImageData(buffer, drawEvent.width, drawEvent.height);
					this.canvasCtx.putImageData(imageData, drawEvent.x, drawEvent.y);
					break;
				}
			}
		}

		this.emitter.emit('drawEvents', { drawEvents, authorId });
	}

	public hasUser(userId: string): boolean {
		return this._users.has(userId);
	}

	public destroy(): void {
		this.emitter.unsubscribeAll();
	}
}
