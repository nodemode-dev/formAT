export interface EngineEvent {
  seq: number;
  type: string;
  [key: string]: unknown;
}

export type ConnectionState = 'connecting' | 'open' | 'closed';

type Listener = (event: EngineEvent) => void;
type StateListener = (state: ConnectionState) => void;

export class EventStream {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private stateListeners = new Set<StateListener>();
  private retry = 0;
  private timer = 0;
  private stopped = false;

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    window.clearTimeout(this.timer);
    this.socket?.close();
  }

  retryNow(): void {
    if (this.stopped || this.socket?.readyState !== WebSocket.CLOSED) return;
    window.clearTimeout(this.timer);
    this.connect();
  }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onState(fn: StateListener): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  private setState(state: ConnectionState): void {
    this.stateListeners.forEach((fn) => fn(state));
  }

  private connect(): void {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.setState('connecting');
    const socket = new WebSocket(`${proto}//${location.host}/api/events`);
    this.socket = socket;
    socket.addEventListener('open', () => {
      this.retry = 0;
      this.setState('open');
    });
    socket.addEventListener('message', (msg) => {
      let event: EngineEvent;
      try {
        event = JSON.parse(String(msg.data));
      } catch {
        return;
      }
      this.listeners.forEach((fn) => fn(event));
    });
    socket.addEventListener('close', () => {
      this.setState('closed');
      if (this.stopped) return;
      const delay = Math.min(8000, 400 * 2 ** this.retry++);
      this.timer = window.setTimeout(() => this.connect(), delay);
    });
  }
}
