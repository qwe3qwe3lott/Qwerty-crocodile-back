export class Room {
  private readonly id: string;
  private readonly users: Map<string, User> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  public join(user: User): void {
    this.users.set(user.id, user);
  }

  public leave(userId: string): boolean {
    return this.users.delete(userId);
  }

  public hasUser(userId: string): boolean {
    return this.users.has(userId);
  }

  public getUsers(): User[] {
    return Array.from(this.users, ([, user]) => ({...user}));
  }
}

export type ResponseData<T extends Record<string, unknown> = Record<string, unknown>> = ({
  _status: 'OK',
} & T) | {_status: 'ERROR'}

export type User = {
  id: string;
  login: string;
}