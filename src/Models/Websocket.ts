import { Logger } from 'logger.js';
import WebSocket from 'ws';
import { Sleep } from './../tools/tools.js';

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

export type WebsocketOpts = {
	port?: number;
	secure?: boolean;
	logger?: Logger;
};

export default abstract class Websocket implements IWebsocket {
	ws: WebSocket | null = null;
	address: string;
	category: string;
	manualExit = false;

	constructor(category: string, ip: string, opts?: WebsocketOpts) {
		if (!opts) opts = { secure: true };

		this.address = `${opts.secure ? 'wss' : 'ws'}://${ip}`;
		if (opts.port) this.address += `:${opts.port}`;

		this.category = category;
	}

	async Connect(): Promise<boolean> {
		return new Promise((Resolve, Reject) => {
			this.ws = new WebSocket(this.address);

			this.ws.addEventListener('open', () => Resolve(this.OpenListener()));

			this.ws.addEventListener('close', (e) => {
				this.CloseListener(e);
			});

			this.ws.addEventListener('message', (e) => this.MessageListener(e));

			this.ws.addEventListener('error', (e) => Reject(this.ErrorListener(e)));
		});
	}

	async Reconnect(): Promise<void> {
		try {
			if (!this.manualExit) {
				await Sleep(10);
				await this.Connect().then(() => this.OnReconnect());
			}
		} catch (err) {
			this.Log('WEBSOCKET_RECONNECT. ', err);
		}
		return;
	}

	async waitConnect(): Promise<boolean> {
		return new Promise((Resolve) => {
			const interval = setInterval(() => {
				if (this.IsOpen) {
					Resolve(this.IsOpen);
				} else if (this.ws?.readyState === WebSocket.OPEN) {
					clearInterval(interval);
					Resolve(this.IsOpen);
				}
				return;
			}, 500);

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
		const date = new Date(Date.now()).toLocaleTimeString();

		Bot.Log.Info('[%s] [%s] %s %O', this.category, date, msg, args ?? {});
	}

	abstract OpenListener(): boolean;
	abstract CloseListener(e: WebSocket.CloseEvent): WebSocket.CloseEvent | void;
	abstract MessageListener(e: WebSocket.MessageEvent): void;
	abstract ErrorListener(e: WebSocket.ErrorEvent): Error;
	abstract OnReconnect(): void;
}
