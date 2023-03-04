import { EPermissionLevel, ECommandFlags } from '../Typings/enums.js';
import { Channel } from '../controller/Channel/index.js';
import User from './../controller/User/index.js';
import { PrivmsgMessage } from '@kararty/dank-twitch-irc';
import { ParseArgumentsError } from './Errors.js';

export enum ArgType {
	String = 'string',
	Boolean = 'boolean',
}

export type LongDescriptionFunction = (prefix: string) => Promise<string[]>;

export type TExecuteFunction<M extends object = object> = (
	this: CommandModel,
	arg0: TCommandContext,
	arg1: M,
) => Promise<CommandResult>;

export type TCommandContext = {
	channel: Channel;
	user: User;
	input: string[];
	data: TContextData;
	Log: CommandLogFn;
};

export type CommandLogType = 'info' | 'error';

export type CommandLogFn = (type: CommandLogType, data: string, ...rest: any[]) => void;

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
	User: PrivmsgMessage;
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

export interface ArgsParseResult {
	output: string[];
	values: TParamsContext;
}

const ArgPrefix = {
	Short: '-',
	Long: '--',
} as const;

export type ModBuilderFn<T extends object = object> = (ctx: TCommandContext) => T;

export type ModBuilderDefault<T extends object = object> = ModBuilderFn<T>;

export interface ModBuilder<Fn extends ModBuilderFn = ModBuilderFn> {
	/**
	 * @returns The module's name. This is used to identify the module.
	 */
	Name(): string;
	Build(ctx: TCommandContext): Promise<ReturnType<Fn>>;
}

export interface CommandModel<Mods extends object = object> {
	/**
	 * Name to invoke command
	 */
	readonly Name: string;
	/**
	 * Prepend the username of command invoker.
	 */
	readonly Ping: boolean;
	/**
	 * Description of command. Used on website and help command.
	 */
	readonly Description: string;
	/**
	 * Permission in channel to run command
	 * Broadcaster, Mod, Vip, Viewer.
	 */
	readonly Permission: EPermissionLevel; // FIXME: Remove this
	/**
	 * If command can only be run while streamer is offline
	 */
	readonly OnlyOffline: boolean;
	/**
	 * Other words which trigger this command
	 */
	readonly Aliases: string[];
	/**
	 * How long the use has to wait before he can use this command again.
	 * Channel wise
	 */
	readonly Cooldown: number;
	/**
	 * Arguments the commands can use
	 * @example <prefix> <command> --foo=bar
	 */
	readonly Params: TArgs[];
	/**
	 * Disables or enables things.
	 * For example setting the flag 'no-banphrase' disables checking for banphrases for this command
	 */
	readonly Flags: ECommandFlags[];
	/**
	 * PreHandlers are executed before the command is executed.
	 * They can be used to pre-fetch data.
	 */
	readonly PreHandlers: ModBuilder[];
	/**
	 * The actual code to run.
	 * @param
	 */
	readonly Code: TExecuteFunction<Mods>;
	/**
	 * Big description on how to use the command.
	 * Supports markdown
	 * @url /bot/commands-list/:commandName
	 */
	readonly LongDescription?: LongDescriptionFunction;

	readonly Execute: CommandExecutor<Mods>;
	readonly HasFlag: FlagChecker;

	/**
	 * Options for early ending the command
	 *
	 * The method has a list of different options for specifying why the command ended early.
	 */
	readonly EarlyEnd: EarlyEndOptions;
}

export interface CommandExecutor<Mods extends object = object> {
	(ctx: TCommandContext, mods: Mods): Promise<CommandResult>;
}

export interface FlagChecker {
	(flag: ECommandFlags): boolean;
}

export interface EarlyEndOptions {
	/**
	 * Specify the input, the user gave was invalid.
	 */
	InvalidInput: (reason?: string) => never;

	/**
	 * A third party api failed to respond.
	 */
	ThirdPartyError: (reason?: string) => never;
}

/**
 * CreatableCommand defines the properties a new command should manually set.
 */
export type CreatableCommand<Mods extends object = object> = Omit<
	CommandModel<Mods>,
	'Execute' | 'HasFlag' | 'EarlyEnd'
>;

/**
 * Argument parser
 *
 * Takes a input array and parses it into a object with the arguments as keys.
 *
 * @example <prefix> <command> --foo bar
 * @example <prefix> <command> --baz
 *
 * Becomes
 * ```json
 * {
 *  foo: 'bar'
 *  baz: true
 * }
 * ```
 */
export function ParseArguments(args: string[], params: TArgs[]): ArgsParseResult {
	const values: TParamsContext = {};

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

	for (let idx = 0; idx < args.length; idx++) {
		let arg = args[idx];
		const param = params.find(
			(p) => ArgPrefix.Long + p[1] === arg || ArgPrefix.Short + p[1][0] === arg,
		);

		if (!param) continue;

		const [type, name] = param;

		if (type === ArgType.Boolean) {
			values[name] = true;
			args = args.filter((a) => a !== arg);

			continue;
		}

		const value = args[idx + 1];
		if (!value) throw new ParseArgumentsError(`Expected value for ${arg}`);

		if (value.startsWith('"') || value.startsWith("'")) {
			const usedQuote = value[0];

			const end = args.findIndex((a, i) => i > idx && a.endsWith(usedQuote));
			if (end === -1) {
				throw new ParseArgumentsError(`Expected end of sentence for ${arg}`);
			}

			const data = args.slice(idx + 1, end + 1);
			const len = data.length;
			const sentence = data.join(' ');
			values[name] = sentence.slice(1, sentence.length - 1);

			args = args.filter((a, i) => i < idx || i > end);
			continue;
		}

		values[name] = value;

		args = args.filter((a, i) => i < idx || i > idx + 1);
		if (idx < args.length) {
			idx--;
		}
	}

	return {
		output: args,
		values,
	};
}
