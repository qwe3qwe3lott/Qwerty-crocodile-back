import { OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ResponseData, Room, User } from './crocodile.entity';
import { v4 as uuidv4 } from 'uuid';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

type Client = Socket<DefaultEventsMap,DefaultEventsMap,DefaultEventsMap, {roomId?: string, userId?: string}>

@WebSocketGateway(3001, {namespace: 'crocodile'})
export class CrocodileGateway implements OnGatewayDisconnect {
  @WebSocketServer()
	readonly server: Server;
  readonly rooms: Map<string, Room> = new Map();

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

    return {_status: 'OK', roomId};
  }

  @SubscribeMessage('joinRoom')
  public async joinRoom(client: Client, { roomId, userId, login }: {roomId?: string, userId?: string, login?: string}): Promise<ResponseData<{
    userId: string, users: User[]
  }>> {
    if (!roomId || !login) return {_status: 'ERROR'};

    const room = this.rooms.get(roomId);

    if (!room || (!!userId && room.hasUser(userId))) return {_status: 'ERROR'};

    if (!userId) userId = uuidv4();

    client.data.roomId = roomId;
    client.data.userId = userId;
    await client.join(roomId);
    room.join({login, id: userId});
    const users = room.getUsers();

    this.server.to(roomId).emit('users', users);

    return {_status: 'OK', userId, users};
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