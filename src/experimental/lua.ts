import assert from 'node:assert';
import { Result, Err, Ok } from '../tools/result.js';
import got from '../tools/Got.js';
import User from './../controller/User/index.js';

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
}

export interface ListRequest {
	type: RequestType.List;
	channel: [string, string];
	invoker: [string, string];
}

export type Request = CommandRequest | ListRequest;

export async function request(request: Request): Promise<Result<string, string>> {
	assert(process.env.EXPERIMENTAL_SERVER_PORT, 'Rust server address is not set.');

	const result = await got('json').post(
		`http://localhost:${process.env.EXPERIMENTAL_SERVER_PORT}/`,
		{
			json: request,
			throwHttpErrors: false,
		},
	);

	if (result.statusCode !== 200) {
		return new Err(`Rust server returned ${result.statusCode} status code. ${result.body}`);
	}

	return new Ok(result.body);
}

type ExperimentOpts = {
	channel: [string, string];
	invoker: [string, string];
	reply_id: string;
	command: string;
};

export async function handleExperimentalLua(opts: ExperimentOpts): Promise<string | null> {
	const port = process.env.EXPERIMENTAL_SERVER_PORT;
	if (!port) {
		return 'Rust server address is not set.';
	}

	const availableCommands = await request({
		type: RequestType.List,
		channel: opts.channel,
		invoker: opts.channel,
	});

	if (availableCommands.err) {
		Bot.Log.Error(availableCommands.inner);

		return null;
	}

	const commands = JSON.parse(availableCommands.inner) as Array<string>;

	if (!commands.includes(opts.command)) {
		Bot.Log.Error(`Command ${opts.command} is not available.`);

		return null;
	}

	const response = await request({
		type: RequestType.Command,
		reply_id: opts.reply_id,
		command: opts.command,
		channel: opts.channel,
		invoker: opts.invoker,
	});

	if (response.err) {
		Bot.Log.Error(response.inner);

		return response.inner;
	}

	return response.inner;
}
