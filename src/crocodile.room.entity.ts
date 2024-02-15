import { DrawEvent, Player, User } from './crocodile.entity';
import { Emitter } from './crocodile.emitter';
import { Canvas, CanvasRenderingContext2D, ImageData } from 'canvas';
import { getRandomArrayElement, shuffleArray } from './app.util';

export type RoomEventPayloadMap = {
	userJoined: User;
	userLeaved: User;
	ownerIdIsChanged: string;
	drawEventsAreAdded: { drawEvents: DrawEvent[], artistId: string };
	stateIsChanged: RoomState;
};

export type RoomEvent = keyof RoomEventPayloadMap;

export type RoomState = 'idle' | 'round' | 'timeout';

export class Room {
	private static readonly CANVAS_WIDTH = 100;
	private static readonly CANVAS_HEIGHT = 141;
	private static readonly MAX_USERS = 16;

	private readonly _id: string;
	private readonly _users: Map<string, User> = new Map();
	private _ownerId: string;
	private _state: RoomState = 'idle';

	private playersQueue: Player[] = [];
	private roundNumber = 0;

	private readonly emitter: Emitter<RoomEvent, RoomEventPayloadMap> = new Emitter();

	private canvas: Canvas = new Canvas(Room.CANVAS_WIDTH, Room.CANVAS_HEIGHT, 'image');
	private get canvasCtx(): CanvasRenderingContext2D {
		return this.canvas.getContext('2d');
	}

	public get isRunning(): boolean {
		return this._state === 'round' || this._state === 'timeout';
	}

	public get state(): RoomState {
		return this._state;
	}

	public get artist(): Player | null {
		return this.playersQueue[this.roundNumber-1] ?? null;
	}

	public get isEmpty(): boolean {
		return this._users.size === 0;
	}

	public get isFull(): boolean {
		return this._users.size >= Room.MAX_USERS;
	}

	public get users(): User[] {
		return Array.from(this._users, ([ , user ]) => ({ ...user }));
	}

	public get players(): Player[] {
		return this.playersQueue;
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

			this.emitter.emit('ownerIdIsChanged', user.id);
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

				this._ownerId = getRandomArrayElement(userIds) ?? '';
			}

			this.emitter.emit('ownerIdIsChanged', this.ownerId);
		}

		return true;
	}

	public draw(drawEvents: DrawEvent[], artistId: string) {
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

		this.emitter.emit('drawEventsAreAdded', { drawEvents, artistId });
	}

	public start(): void {
		this.toState('round');
	}

	public stop(): void {
		this.toState('idle');
	}

	private toState(state: RoomState): void {
		switch (state) {
			case 'idle': {
				this.playersQueue = [];
				this.roundNumber = 0;
				this.draw([ { type: 'fill', color: 'white' } ], '');
				this._state = state;
				break;
			}
			case 'round': {
				if (this.roundNumber === 0) {
					this.playersQueue = shuffleArray(Array.from(this._users).map(([ ,user ]) => ({ id: user.id, login: user.login })));
				}
				this.roundNumber += 1;
				this.draw([ { type: 'fill', color: 'white' } ], '');
				this._state = state;
				break;
			}
			case 'timeout': {
				this._state = state;
				break;
			}
		}

		this.emitter.emit('stateIsChanged', state);
	}
 
	public hasUser(userId: string): boolean {
		return this._users.has(userId);
	}

	public destroy(): void {
		this.emitter.unsubscribeAll();
	}
}
