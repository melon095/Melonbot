import { EPermissionLevel, ECommandFlags } from '../Typings/enums.js';
import { Channel } from 'controller/Channel';
import User from './../controller/User/index.js';

export enum ArgType {
	String = 'string',
	Boolean = 'boolean',
}

export type LongDescriptionFunction = (prefix: string) => Promise<string[]>;

export type TExecuteFunction = (arg0: TCommandContext) => Promise<CommandResult>;

export type TCommandContext = {
	channel: Channel;
	user: User;
	input: string[];
	data: TContextData;
};

/// [ArgType, string]
export type TArgs = (ArgType | string)[];

export type TParamsContext = {
	[key: string]: string | boolean;
};

export type TContextData = {
	/**
	 * Channel parameters
	 */
	Params: TParamsContext;
	/**
	 * Extra data that twitch sends with the user.
	 */
	User: object;
};

export type CommandResult = {
	/**
	 * @description Wether or not the command was successful. Think of it as a 'safe' success.
	 *  Anything that actually fails should throw.
	 */
	Success: boolean;
	/**
	 * @description The result of the command. This will be sent to the chat. If Success is false, Result should contain an error message, which can be shown in chat.
	 */
	Result: string;
};

export class ParseArgumentsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ArgsParseError';
	}
}

export interface ArgsParseResult {
	input: string[];
	values: TParamsContext;
}

export abstract class CommandModel {
	/**
	 * Name to invoke command
	 */
	public abstract readonly Name: string;

	/**
	 * Prepend the username of command invoker.
	 */
	public abstract readonly Ping: boolean;

	/**
	 * Description of command. Used on website and help command.
	 */
	public abstract readonly Description: string;

	/**
	 * Permission in channel to run command
	 * Broadcaster, Mod, Vip, Viewer.
	 */
	public abstract readonly Permission: EPermissionLevel;

	/**
	 * If command can only be run while streamer is offline
	 */
	public abstract readonly OnlyOffline: boolean;

	/**
	 * Other words which trigger this command
	 */
	public abstract readonly Aliases: string[];

	/**
	 * How long the use has to wait before he can use this command again.
	 * Channel wise
	 */
	public abstract readonly Cooldown: number;

	/**
	 * Arguments the commands can use
	 * @example <prefix> <command> --foo=bar
	 */
	public abstract readonly Params: TArgs[];

	/**
	 * Disables or enables things.
	 * For example setting the flag 'no-banphrase' disables checking for banphrases for this command
	 */
	public abstract readonly Flags: ECommandFlags[];

	/**
	 * The actual code to run.
	 * @param
	 */
	public abstract readonly Code: TExecuteFunction;

	/**
	 * Big description on how to use the command.
	 * Supports markdown
	 * @url /bot/commands/:commandName
	 */
	public readonly LongDescription?: LongDescriptionFunction;

	public async Execute(ctx: TCommandContext): Promise<CommandResult> {
		return this.Code(ctx);
	}

	static ParseArguments(args: string[], params: TArgs[]): ArgsParseResult {
		let copy = [...args];
		const values: TParamsContext = {};

		// Setup default data to params.
		for (const param of params) {
			const [type, name] = param;

			switch (type) {
				case 'string': {
					values[name] = '';
					break;
				}

				case 'boolean': {
					values[name] = false;
					break;
				}
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const [_, word] of args.entries()) {
			if (word.slice(0, 2) === '--') {
				const param = word.slice(2);

				const paramType = params.find((i) => param.includes(i[1]));

				if (paramType === undefined)
					throw new ParseArgumentsError(`Invalid argument: ${param}`);

				const [type, name] = paramType;

				switch (type) {
					case 'string': {
						const value = word.slice(word.indexOf('=') + 1, word.length);
						values[word.slice(2, word.indexOf('=', 3))] = value.toString();
						break;
					}
					case 'boolean': {
						values[name] = true;
						break;
					}
				}
				copy = copy.filter((i) => i !== word);
			}
		}

		return { input: copy, values };
	}
}
