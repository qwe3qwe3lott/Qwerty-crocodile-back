export type User = {
	id: string;
	login: string;
};

export type DrawEvent =
	{ type: 'line', color: string, width: number, x1: number, y1: number, x2: number, y2: number }
	| { type: 'fill', color: string }
	| { type: 'path', color: string, width: number, nodes: Array<{ x: number, y: number }> }
	| { type: 'image', data: ArrayBuffer, x: number, y: number, width: number, height: number };
