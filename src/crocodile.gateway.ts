import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Room } from './crocodile.entity';
import { infinite } from './crocodile.util';

const roomIdGenerator = infinite();

@WebSocketGateway(80, {namespace: 'crocodile'})
export class CrocodileGateway {
  @WebSocketServer()
	readonly socket: Server;
  readonly rooms: Map<number, Room> = new Map();

  @SubscribeMessage('createRoom')
  public createRoom(): string {
    const id = roomIdGenerator.next().value;

    if (!id) return 'ERROR';

    const room = new Room(id);

    this.rooms.set(id, room);

    return 'OK';
  }

  @SubscribeMessage('getRoomsCount')
  public getRoomsCount(): number {
    return this.rooms.size;
  }
}