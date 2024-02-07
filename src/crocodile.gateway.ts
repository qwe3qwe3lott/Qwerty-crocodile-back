import { OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ResponseData, Room, User } from './crocodile.entity';
import { v4 as uuidv4 } from 'uuid';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { Cron, CronExpression } from '@nestjs/schedule';

type Client = Socket<DefaultEventsMap,DefaultEventsMap,DefaultEventsMap, {roomId?: string, userId?: string}>

@WebSocketGateway(3001, {namespace: 'crocodile', cors: true})
export class CrocodileGateway implements OnGatewayDisconnect {
  @WebSocketServer()
	readonly server: Server;
  readonly rooms: Map<string, Room> = new Map();
  readonly emptyRoomChecks: WeakMap<Room, number> = new WeakMap();

  @Cron(CronExpression.EVERY_10_MINUTES)
  handleCron() {
    for (const [roomId,room] of this.rooms) {
      if (!room.isEmpty()) continue;

      const count = (this.emptyRoomChecks.get(room) ?? 0) + 1;

      if (count >= 3) this.rooms.delete(roomId);
      else this.emptyRoomChecks.set(room, count);
    }
  }

  handleDisconnect(client: Client): void {
    const {roomId, userId} = client.data;

    if (!roomId || !userId) return;

    const room = this.rooms.get(roomId);

    if (!room) return;

    room.leave(userId);
  }

  @SubscribeMessage('createRoom')
  public createRoom(): ResponseData<{roomId: string}> {
    const roomId = uuidv4();

    const room = new Room(roomId);

    this.rooms.set(roomId, room);
    this.emptyRoomChecks.set(room, 0);

    room.on('userJoined', () => {
      this.server.to(roomId).emit('users', room.getUsers());
    });

    room.on('userLeaved', () => {
      this.server.to(roomId).emit('users', room.getUsers());
    });

    return {_status: 'OK', roomId};
  }

  @SubscribeMessage('joinRoom')
  public async joinRoom(client: Client, { roomId, userId, login }: {roomId?: string, userId?: string, login?: string}): Promise<ResponseData<{
    userId: string, users: User[]
  }>> {
    if (!!client.data.userId || !!client.data.roomId || !roomId || !login) return {_status: 'ERROR'};

    const room = this.rooms.get(roomId);

    if (!room || (!!userId && room.hasUser(userId))) return {_status: 'ERROR'};

    if (!userId) userId = uuidv4();

    client.data.roomId = roomId;
    client.data.userId = userId;
    room.join({login, id: userId});
    await client.join(roomId);
    const users = room.getUsers();

    return {_status: 'OK', userId, users};
  }

  @SubscribeMessage('leaveRoom')
  public leaveRoom(client: Client): ResponseData {
    const {roomId, userId} = client.data;

    if (!roomId || !userId) return {_status: 'ERROR'};

    const room = this.rooms.get(roomId);

    if (!room) return {_status: 'ERROR'};

    client.leave(roomId);
    room.leave(userId);

    delete client.data.roomId;
    delete client.data.userId;

    return {_status: 'OK'};
  }

  @SubscribeMessage('getUsers')
  public getUsers(client: Client): ResponseData<{users: Array<User>}> {
    const {roomId, userId} = client.data;

    if (!roomId || !userId) return {_status: 'ERROR'};

    const room = this.rooms.get(roomId);

    if (!room || !room.hasUser(userId)) return {_status: 'ERROR'};

    const users = room.getUsers();

    return {_status: 'OK', users};
  }
}