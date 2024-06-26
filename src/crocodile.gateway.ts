import { OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { CrocodileService } from './crocodile.service';
import { Answer, DrawEvent, Player, TimerState, User } from './crocodile.entity';
import { RoomState } from './crocodile.room.entity';

type ResponseData<TSuccess extends Record<string, unknown> = Record<string, unknown>, TError extends Record<string, unknown> = Record<string, unknown>> =
  ({ _status: 'OK' } & TSuccess) | ({ _status: 'ERROR' } & TError);

type StateTransaction =
	{ state: 'idle' } |
	{ state: 'round', timerState: TimerState | null, players: Player[], artistId: string, answer: Answer | null } |
	{ state: 'timeout', timerState: TimerState | null, answer: Answer | null };

type ServerToClientEvents = {
	users: (users: User[]) => void;
	ownerId: (ownerId: string) => void;
	drawEvents: (drawEvents: DrawEvent[]) => void;
	stateTransaction: (transaction: StateTransaction) => void;
	players: (players: Player[]) => void;
};

type ClientToServerEvents = {
	createRoom: (payload: null, cb: (response: ResponseData<{ roomId: string }>) => void) => void;
	joinRoom: (
		payload: Partial<{ roomId: string, userId: string, login: string }>,
		cb: (response: ResponseData<{
			userId: string,
			users: User[],
			ownerId: string,
			drawEvents: DrawEvent[],
			artistId: string,
			state: RoomState,
			players: Player[],
			timerState: TimerState | null,
			answer: Answer | null,
		}>) => void
	) => void;
	leaveRoom: (payload: null, cb: (response: ResponseData) => void) => void;
	draw: (payload: DrawEvent[], cb: (response: ResponseData) => void) => void;
	start: (payload: null, cb: (response: ResponseData) => void) => void;
	stop: (payload: null, cb: (response: ResponseData) => void) => void;
	answer: (payload: string | undefined, cb: (response: ResponseData<{ isRight: boolean }>) => void) => void;
};

type SocketData = { roomId?: string, userId?: string };

type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;
type ServerSocket = Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;

type Response<K extends keyof ClientToServerEvents> = Parameters<Parameters<ClientToServerEvents[K]>[1]>[0];
type Payload<K extends keyof ClientToServerEvents> = Parameters<ClientToServerEvents[K]>[0];

@WebSocketGateway(3001, { namespace: 'crocodile', cors: true })
export class CrocodileGateway implements OnGatewayDisconnect {
	@WebSocketServer()
	readonly server: ServerSocket;

	constructor(private crocodileService: CrocodileService) {}

	handleDisconnect(client: ClientSocket): void {
		const { roomId, userId } = client.data;

		if (!roomId || !userId) return;

		const room = this.crocodileService.getRoom(roomId);

		if (!room) return;

		room.leave(userId);
	}

	@SubscribeMessage('createRoom')
	public createRoom(): Response<'createRoom'> {
		const room = this.crocodileService.createRoom();

		room.on('userJoined', () => {
			this.server.to(room.id).emit('users', room.users);
		});

		room.on('userLeaved', () => {
			this.server.to(room.id).emit('users', room.users);
		});

		room.on('ownerIdIsChanged', (ownerId) => {
			this.server.to(room.id).emit('ownerId', ownerId);
		});

		room.on('playersAreChanged', (players) => {
			this.server.to(room.id).emit('players', players);
		});

		room.on('drawEventsAreAdded', async ({ drawEvents, artistId }) => {
			const sockets = await this.server.to(room.id).fetchSockets();

			for (const socket of sockets) {
				socket.data.userId !== artistId && socket.emit('drawEvents', drawEvents);
			}
		});

		room.on('stateIsChanged', async (state) => {
			switch (state) {
				case 'idle': {
					const payload = { state };

					this.server.to(room.id).emit('stateTransaction', payload);

					break;
				}
				case 'round': {
					const players = room.players;
					const artistId = room.artist?.id ?? '';
					const timerState = room.timerState;
					const answer = null;
					const payload = { state, players, artistId, timerState, answer };

					const sockets = await this.server.to(room.id).fetchSockets();

					for (const socket of sockets) {
						if (socket.data.userId !== room.artist?.id) socket.emit('stateTransaction', payload);
						else socket.emit('stateTransaction', { ...payload, answer: room.answer });
					}

					break;
				}
				case 'timeout': {
					const timerState = room.timerState;
					const answer = room.answer;
					const payload = { state, timerState, answer };

					this.server.to(room.id).emit('stateTransaction', payload);

					break;
				}
			}
		});

		return { _status: 'OK', roomId: room.id };
	}

	@SubscribeMessage('joinRoom')
	public async joinRoom(client: ClientSocket, { roomId, userId, login }: Payload<'joinRoom'>): Promise<Response<'joinRoom'>> {
		if (!!client.data.userId || !!client.data.roomId || !roomId || !login) return { _status: 'ERROR' };

		const room = this.crocodileService.getRoom(roomId);

		if (!room || room.isFull || (!!userId && room.hasUser(userId))) return { _status: 'ERROR' };

		if (!userId) userId = uuidv4();

		client.data.roomId = roomId;
		client.data.userId = userId;
		room.join({ login, id: userId });
		await client.join(roomId);
		const users = room.users;
		const ownerId = room.ownerId;
		const drawEvents: DrawEvent[] = [ { type: 'image', x: 0, y: 0, ...room.canvasImageData } ];
		const artistId = room.artist?.id ?? '';
		const state = room.state;
		const players = room.players;
		const timerState = room.timerState;
		const answer = userId === artistId ? room.answer : null;

		return { _status: 'OK', userId, users, ownerId, drawEvents, artistId, state, players, timerState, answer };
	}

	@SubscribeMessage('leaveRoom')
	public leaveRoom(client: ClientSocket): Response<'leaveRoom'> {
		const { roomId, userId } = client.data;

		if (!roomId || !userId) return { _status: 'ERROR' };

		const room = this.crocodileService.getRoom(roomId);

		if (!room) return { _status: 'ERROR' };

		client.leave(roomId);
		room.leave(userId);

		delete client.data.roomId;
		delete client.data.userId;

		return { _status: 'OK' };
	}

	@SubscribeMessage('draw')
	public draw(client: ClientSocket, drawEvents: Payload<'draw'>): Response<'draw'> {
		const { roomId, userId } = client.data;

		if (!roomId || !userId) return { _status: 'ERROR' };

		const room = this.crocodileService.getRoom(roomId);

		if (!room || !room.isRunning || !room.hasPlayer(userId)) return { _status: 'ERROR' };

		room.draw(drawEvents, userId);

		return { _status: 'OK' };
	}

	@SubscribeMessage('start')
	public start(client: ClientSocket): Response<'start'> {
		const { roomId, userId } = client.data;

		if (!roomId || !userId) return { _status: 'ERROR' };

		const room = this.crocodileService.getRoom(roomId);

		if (!room || room.users.length < 2 || room.isRunning || room.ownerId !== userId) return { _status: 'ERROR' };

		room.start();

		return { _status: 'OK' };
	}

	@SubscribeMessage('stop')
	public stop(client: ClientSocket): Response<'start'> {
		const { roomId, userId } = client.data;

		if (!roomId || !userId) return { _status: 'ERROR' };

		const room = this.crocodileService.getRoom(roomId);

		if (!room || !room.isRunning || room.ownerId !== userId) return { _status: 'ERROR' };

		room.stop();

		return { _status: 'OK' };
	}

	@SubscribeMessage('answer')
	public answer(client: ClientSocket, answer: Payload<'answer'>): Response<'answer'> {
		const { roomId, userId } = client.data;

		if (!roomId || !userId || !answer) return { _status: 'ERROR' };

		const room = this.crocodileService.getRoom(roomId);

		if (!room || !room.isRunning || !room.hasPlayer(userId) || room.artist?.id === userId) return { _status: 'ERROR' };

		const isRight = room.applyAnswer(answer, userId);

		return { _status: 'OK', isRight };
	}
}
