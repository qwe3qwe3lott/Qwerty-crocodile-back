export type RoomEvent = 'userJoined' | 'userLeaved';

export type RoomEventPayload = {
  userJoined: User;
  userLeaved: User;
}

type RoomSubscribes = {
  [key in RoomEvent]: Set<(payload: RoomEventPayload[key]) => void>
}

export class Room {
  public readonly id: string;
  private readonly users: Map<string, User> = new Map();
  private readonly subscriptions: RoomSubscribes;

  constructor(id: string) {
    this.id = id;
    this.subscriptions = {
      userJoined: new Set(),
      userLeaved: new Set(),
    };
  }

  public on<Event extends RoomEvent = RoomEvent>(event: RoomEvent, callback: (payload: RoomEventPayload[Event]) => void): () => void {
    this.subscriptions[event].add(callback);

    return () => {
      this.subscriptions[event].delete(callback);
    };
  }

  private emit<Event extends RoomEvent = RoomEvent>(event: RoomEvent, payload: RoomEventPayload[Event]) {
    for (const subscription of this.subscriptions[event]) {
      subscription(payload);
    }
  }

  public join(user: User): void {
    this.users.set(user.id, user);

    this.emit('userJoined', user);
  }

  public leave(userId: string): boolean {
    const user = this.users.get(userId);

    if (!user) return false;

    this.users.delete(userId);

    this.emit('userLeaved', user);

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
}

export type User = {
  id: string;
  login: string;
}