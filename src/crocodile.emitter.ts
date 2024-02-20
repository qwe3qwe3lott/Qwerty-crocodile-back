export class Emitter<Event extends string, EventPayloadMap extends Record<Event, unknown>> {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	private readonly subscriptionsMap: { [Key in Event]: Set<(payload: EventPayloadMap[Key]) => void> } = {};

	public subscribe(event: Event, callback: (payload: EventPayloadMap[Event]) => void): () => void {
		if (!this.subscriptionsMap[event]) this.subscriptionsMap[event] = new Set();

		this.subscriptionsMap[event].add(callback);

		return () => {
			this.subscriptionsMap[event].delete(callback);
		};
	}

	public unsubscribe(event: Event, callback: (payload: EventPayloadMap[Event]) => void): void {
		if (!this.subscriptionsMap[event]) this.subscriptionsMap[event] = new Set();

		this.subscriptionsMap[event].delete(callback);
	}

	public unsubscribeAll(): void {
		for (const subscriptions of Object.values<Set<(payload: EventPayloadMap[Event]) => void>>(this.subscriptionsMap)) {
			subscriptions.clear();
		}
	}

	public emit(event: Event, payload: EventPayloadMap[Event]): void {
		if (!this.subscriptionsMap[event]) this.subscriptionsMap[event] = new Set();

		for (const subscription of this.subscriptionsMap[event]) {
			subscription(payload);
		}
	}
}
