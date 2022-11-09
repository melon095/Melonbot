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
		this.name = 'ParseArgumentsError';
	}
}

export interface ArgsParseResult {
	output: string[];
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

	public HasFlag(flag: ECommandFlags): boolean {
		return this.Flags.includes(flag);
	}

	/**
	 * Argument parser
	 *
	 * Takes a input array and parses it into a object with the arguments as keys.
	 *
	 * @example <prefix> <command> --foo bar
	 * @example <prefix> <command> --baz
	 *
	 * Becomes
	 * {
	 *  foo: 'bar'
	 *  baz: true
	 * }
	 */
	static ParseArguments(args: string[], params: TArgs[]): ArgsParseResult {
		const values: TParamsContext = {};
		let copy = Array.from(args);

		// Fill arguments with default values
		for (const param of params) {
			const [type, name] = param;

			switch (type) {
				case ArgType.String:
					values[name] = '';
					break;
				case ArgType.Boolean:
					values[name] = false;
					break;
			}
		}

		for (const param of params) {
			const [type, fullName] = param;

			const char = fullName[0];

			const index = [copy.indexOf(`--${fullName}`), copy.indexOf(`-${char}`)].find(
				(i) => i !== -1,
			);

			if (index === undefined) continue;

			if (type === ArgType.Boolean) {
				values[fullName] = true;
				copy = copy.filter((arg) => arg !== `--${fullName}` && arg !== `-${char}`);
				continue;
			}

			const value = copy[index + 1];
			if (value) {
				values[fullName] = value;
			} else {
				continue;
			}

			copy = copy.filter((_, i) => i !== index && i !== index + 1);
		}

		return {
			output: copy,
			values,
		};
	}
}
