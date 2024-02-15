export type TimerState = 'idle' | 'running';

export class Timer {
	private _state: TimerState = 'idle';
	private _startUTCMs: number = NaN;
	private _timeout: ReturnType<typeof setTimeout> | null = null;

	public get leftTime(): number { return new Date().getTime() - NaN; }

	public get isRunning(): boolean { return this._state === 'running'; }

	public start(ms: number, cb: () => void): void {
		if (this.isRunning) this.stop();

		this._startUTCMs = new Date().getTime();
		this._state = 'running';

		this._timeout = setTimeout(() => {
			this._state = 'idle';
			this._startUTCMs = NaN;
			this._timeout = null;

			cb();
		}, ms);
	}

	public stop(): void {
		if (!this._timeout) return;

		clearTimeout(this._timeout);

		this._startUTCMs = NaN;
		this._state = 'idle';
		this._timeout = null;
	}
}