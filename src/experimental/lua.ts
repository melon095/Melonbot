import assert from 'node:assert';
import { Result, Err, Ok } from '../tools/result.js';
import got from '../tools/Got.js';

export enum RequestType {
	Command = 'command',
	List = 'list',
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

export async function request(request: Request): Promise<Result<[number, string], string>> {
	assert(process.env.EXPERIMENTAL_SERVER_PORT, 'Rust server address is not set.');

	const result = await got('json').post(
		`http://localhost:${process.env.EXPERIMENTAL_SERVER_PORT}/`,
		{
			json: request,
			throwHttpErrors: false,
		},
	);

	if (result.statusCode !== 200) {
		return new Err(`Rust server returned ${result.statusCode} status code.`);
	}

	return new Ok([result.statusCode, result.body]);
}
