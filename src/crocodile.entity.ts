export type User = {
	id: string;
	login: string;
};

export type Player = {
	id: string;
	login: string;
	points: number;
	hasRightAnswer?: true;
};

export type DrawEvent =
	{ type: 'line', color: string, width: number, x1: number, y1: number, x2: number, y2: number }
	| { type: 'fill', color: string }
	| { type: 'path', color: string, width: number, nodes: Array<{ x: number, y: number }> }
	| { type: 'image', data: ArrayBuffer, x: number, y: number, width: number, height: number };

export type TimerState = {
	startTime: number;
	duration: number;
};

export type Answer = {
	label: string;
	posterUrl: string;
	value: string;
};

export interface AnswerAdapter {
	fetchAnswer(): Promise<Answer | null>;
}
