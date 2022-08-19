/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import WebSocket from 'ws';

interface IWebsocket {
	ws: WebSocket | null;
	address: string;
	category: string;
	manualExit: boolean;

	Connect: () => Promise<boolean>;
	Reconnect: () => Promise<void>;
	waitConnect: () => Promise<boolean>;
	Close: () => Promise<void>;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Log: (msg: string, ...args: any[]) => void;

	OpenListener: () => boolean;
	ErrorListener: (e: WebSocket.ErrorEvent) => Error;
	MessageListener: (e: WebSocket.MessageEvent) => void;
	CloseListener: (e: WebSocket.CloseEvent) => WebSocket.CloseEvent | void;
	OnReconnect: () => void;
}

export default abstract class MWebSocket implements IWebsocket {
	ws: WebSocket | null = null;
	address: string;
	category: string;
	manualExit = false;

	constructor(category: string, ip: string, port?: number, secure = true) {
		this.address = `${secure ? 'wss' : 'ws'}://${ip}`;
		if (port) this.address += `:${port}`;

		this.category = category;
	}

	async Connect(): Promise<boolean> {
		return new Promise((Resolve, Reject) => {
			this.ws = new WebSocket(this.address);

			this.ws.addEventListener('open', () =>
				Resolve(this.OpenListener()),
			);

			this.ws.addEventListener('close', (e) => {
				this.CloseListener(e);
			});

			this.ws.addEventListener('message', (e) => this.MessageListener(e));

			this.ws.addEventListener('error', (e) => this.ErrorListener(e));
		});
	}

	async Reconnect(): Promise<void> {
		try {
			if (!this.manualExit)
				await this.Connect().then(() => this.OnReconnect());
		} catch (err: any) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.Log('WEBSOCKET_RECONNECT. ', new Error(err).message);
		}
		return Promise.resolve();
	}

	async waitConnect(): Promise<boolean> {
		return new Promise((Resolve, Reject) => {
			const interval = setInterval(() => {
				if (this.IsOpen) {
					Resolve(this.IsOpen);
				} else if (this.ws?.readyState === WebSocket.OPEN) {
					clearInterval(interval);
					Resolve(this.IsOpen);
				}
				return;
			}, 100);

			setTimeout(() => {
				clearInterval(interval);
			}, 5000);
		});
	}

	get IsOpen(): boolean {
		if (this.ws?.OPEN) return true;
		return false;
	}

	async Close(): Promise<void> {
		if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
			this.Log('Closed connection...');
			this.ws.close(1000);
			this.manualExit = true;
		}
	}

	async ManualConnect(): Promise<void> {
		if (this.ws?.readyState === WebSocket.CLOSED && this.manualExit) {
			this.manualExit = false;
			this.Connect();
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Log(msg: string, ...args: any[]): void {
		const LCSUCCESS = `\x1b[32m[%s] [%s]\x1b[0m %s`; //green
		const date = new Date(Date.now()).toLocaleTimeString();
		console.log(LCSUCCESS, this.category, date, msg, args ?? '');
	}

	abstract OpenListener(): boolean;
	abstract CloseListener(
		e: WebSocket.CloseEvent,
	): WebSocket.CloseEvent | void;
	abstract MessageListener(e: WebSocket.MessageEvent): void;
	abstract ErrorListener(e: WebSocket.ErrorEvent): Error;
	abstract OnReconnect(): void;
}
