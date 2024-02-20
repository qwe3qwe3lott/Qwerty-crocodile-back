import { TimerState } from './crocodile.entity';

export class Timer {
	private _state: TimerState | null = null;
	private _timeout: ReturnType<typeof setTimeout> | null = null;

	public get state(): TimerState | null { return this._state; }

	public get isRunning(): boolean { return !!this._state; }

	public start(duration: number, cb: () => void): void {
		if (this.isRunning) this.stop();

		this._state = {
			startTime: new Date().getTime(),
			duration,
		};

		this._timeout = setTimeout(() => {
			this._state = null;
			this._timeout = null;

			cb();
		}, duration);
	}

	public stop(): void {
		this._state = null;

		if (!this._timeout) return;

		clearTimeout(this._timeout);
	}
}
