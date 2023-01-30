import assert from 'node:assert';
import { Result, Err, Ok } from '../tools/result.js';
import got from '../tools/Got.js';
import Websocket from './../Models/Websocket.js';
import { CloseEvent, MessageEvent, ErrorEvent } from 'ws';
import { Sleep } from './../tools/tools.js';

export enum RequestType {
	Command = 'Command',
	List = 'List',
}

export interface CommandRequest {
	type: RequestType.Command;
	reply_id: string;
	command: string;
	channel: [string, string];
	invoker: [string, string];
	arguments: Array<string>;
}

export interface ListRequest {
	type: RequestType.List;
	channel: [string, string];
	invoker: [string, string];
}

export interface CommandResponse {
	Command: {
		channel: string;
		reply_id: string;
		response: string;
	};
}

export interface ListResponse {
	List: {
		commands: Array<string>;
	};
}

export type Request = CommandRequest | ListRequest;
export type Response = CommandResponse | ListResponse;

export class LuaWebsocket extends Websocket {
	private commands: Array<string> = [];

	constructor() {
		const port = process.env.EXPERIMENTAL_SERVER_PORT;
		assert(port, 'Rust server address is not set.');

		super('Lua', `127.0.0.1`, { secure: false, port: Number(port) });
	}

	OpenListener(): boolean {
		super.Log('Connected to Lua server.');

		return true;
	}
	CloseListener(e: CloseEvent): void | CloseEvent {
		super.Log('Disconnected from Lua server.');
	}
	MessageListener(e: MessageEvent): void {
		const data = JSON.parse(e.data.toString()) as Response;

		if ('Command' in data) {
			const { channel, reply_id, response } = data.Command;

			const channel_class = Bot.Twitch.Controller.TwitchChannelSpecific({ ID: channel });

			if (!channel_class) {
				Bot.Log.Error(`Channel ${channel} is not available.`);
				return;
			}

			channel_class.reply(response, reply_id);

			Bot.Log.Info(`Received response for ${reply_id}: ${response}`);
		} else if ('List' in data) {
			const response = data.List;
			Bot.Log.Info(`Received list of available commands: ${response.commands}`);

			this.commands = response.commands;
		} else {
			super.Log(`Unknown response: ${e.data}`);
		}
	}
	ErrorListener(e: ErrorEvent): Error {
		super.Log('Error in Lua server connection.');
		return new Error(e.message);
	}
	OnReconnect(): void {
		super.Log('Reconnected to Lua server.');
	}

	public QueryCommand(opts: Request): void {
		this.ws?.send(opts);
	}

	public async HasCommand(
		command: string,
		channel: [string, string],
		invoker: [string, string],
	): Promise<boolean> {
		if (this.commands.includes(command)) {
			return true;
		}

		this.ws?.send(
			JSON.stringify({
				type: RequestType.List,
				channel,
				invoker,
			}),
		);

		// wait until we get the list of commands

		Sleep(1000);

		return this.commands.includes(command);
	}
}
