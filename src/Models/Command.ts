/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import { TArgs, TCommandContext, TExecuteFunction } from '../Typings/types';
import { EPermissionLevel, ECommandFlags } from '../Typings/enums.js';
import { Promolve, IPromolve } from '@melon95/promolve';

type LongDescriptionFunction = (prefix: string) => Promise<string>;

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

	public readonly LongDescription?: LongDescriptionFunction;

	protected Promolve: IPromolve<string>;

	constructor() {
		this.Promolve = Promolve<string>();
	}

	public Execute(ctx: TCommandContext): Promise<string> {
		this.Code(ctx).catch((error) => {
			this.Reject(error);
		});
		return this.Promolve.promise;
	}

	protected Resolve(data: string | void): void {
		this.Promolve.resolve((data ??= ''));
	}

	protected Reject(error: Error): void {
		this.Promolve.reject(error);
	}
}
