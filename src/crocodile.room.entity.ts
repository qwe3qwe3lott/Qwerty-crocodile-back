import { User } from './crocodile.entity';
import { Emitter } from './crocodile.emitter';


export type RoomEvent = 'userJoined' | 'userLeaved';

export type RoomEventPayloadMap = {
  userJoined: User;
  userLeaved: User;
}

export class Room {
  public readonly id: string;
  private readonly users: Map<string, User> = new Map();
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
  }

  public leave(userId: string): boolean {
    const user = this.users.get(userId);

    if (!user) return false;

    this.users.delete(userId);

    this.emitter.emit('userLeaved', user);

    return true;
  }

  public isEmpty(): boolean {
    return this.users.size === 0;
  }

  public hasUser(userId: string): boolean {
    return this.users.has(userId);
  }

  public getUsers(): User[] {
    return Array.from(this.users, ([, user]) => ({...user}));
  }

  public destroy(): void {
    this.emitter.unsubscribeAll();
  }
}
