export type EventHandler<Payload> = (payload: Payload) => void;

export class EventBus<Events extends object> {
  private readonly listeners = new Map<
    keyof Events,
    Set<EventHandler<Events[keyof Events]>>
  >();

  public on<EventName extends keyof Events>(
    eventName: EventName,
    handler: EventHandler<Events[EventName]>,
  ): () => void {
    const handlers = this.getOrCreateHandlers(eventName);
    handlers.add(handler as EventHandler<Events[keyof Events]>);

    return () => {
      this.off(eventName, handler);
    };
  }

  public once<EventName extends keyof Events>(
    eventName: EventName,
    handler: EventHandler<Events[EventName]>,
  ): () => void {
    let unsubscribe = (): void => undefined;
    const onceHandler: EventHandler<Events[EventName]> = (payload) => {
      unsubscribe();
      handler(payload);
    };
    unsubscribe = this.on(eventName, onceHandler);
    return unsubscribe;
  }

  public off<EventName extends keyof Events>(
    eventName: EventName,
    handler: EventHandler<Events[EventName]>,
  ): void {
    const handlers = this.listeners.get(eventName);
    if (handlers === undefined) {
      return;
    }

    handlers.delete(handler as EventHandler<Events[keyof Events]>);
    if (handlers.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  public emit<EventName extends keyof Events>(
    eventName: EventName,
    payload: Events[EventName],
  ): void {
    const handlers = this.listeners.get(eventName);
    if (handlers === undefined) {
      return;
    }

    for (const handler of [...handlers]) {
      (handler as EventHandler<Events[EventName]>)(payload);
    }
  }

  public clear<EventName extends keyof Events>(eventName?: EventName): void {
    if (eventName === undefined) {
      this.listeners.clear();
      return;
    }

    this.listeners.delete(eventName);
  }

  public listenerCount<EventName extends keyof Events>(eventName: EventName): number {
    return this.listeners.get(eventName)?.size ?? 0;
  }

  private getOrCreateHandlers<EventName extends keyof Events>(
    eventName: EventName,
  ): Set<EventHandler<Events[keyof Events]>> {
    const existingHandlers = this.listeners.get(eventName);
    if (existingHandlers !== undefined) {
      return existingHandlers;
    }

    const handlers = new Set<EventHandler<Events[keyof Events]>>();
    this.listeners.set(eventName, handlers);
    return handlers;
  }
}
