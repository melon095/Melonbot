import { TUserCooldown, ChannelTalkOptions } from './../../Typings/types';
import { EPermissionLevel, ECommandFlags } from './../../Typings/enums.js';
import { CheckMessageBanphrase } from './../Banphrase/index.js';
import DankTwitch from '@kararty/dank-twitch-irc';
import {
	ParseArguments,
	TCommandContext,
	ArgsParseResult,
	CommandLogFn,
	CommandLogType,
	CommandModel,
} from '../../Models/Command.js';
import TriviaController from './../Trivia/index.js';
import User from './../User/index.js';
import PreHandler from './../../PreHandlers/index.js';
import Helix, {
	CreateEventSubResponse,
	EventSubFulfilledStatus,
	EventSubSubscription,
} from './../../Helix/index.js';
import { RedisSingleton } from './../../Singletons/Redis/index.js';
import { EventsubTypes } from './../../Singletons/Redis/Data.Types';
import { IPromolve, Promolve } from '@melon95/promolve';
import { Insertable, sql } from 'kysely';
import CommandsExecutionTable from '../DB/Tables/CommandsExecutionTable.js';
import { PermissionMode, PermissionModeToDatabase } from '../DB/Tables/ChannelTable.js';
import { GetCommandBy } from '../Commands/Handler.js';
import {
	GetSafeError,
	InvalidInputError,
	ParseArgumentsError,
	PreHandlerError,
	ThirdPartyError,
} from '../../Models/Errors.js';
import { ChannelDataNames, DataStoreContainer, GetChannelData } from '../../IndividualData.js';
import { SevenTVChannelIdentifier } from '../../SevenTVGQL.js';

/**
 * Encapsulated data for every channel.
 */
export class Channel {
	/**
	 * @description Channel name
	 */
	public Name: string;

	public get LowercaseName(): string {
		return this.Name.toLocaleLowerCase();
	}
	/**
	 * @description User id of channel
	 */
	public Id: string;
	/**
	 * @description Mode
	 * @description Read - Read the chat but don't listen to commands
	 * @description Write - Read the chat and listen to commands. Cooldown is 1250 milliseconds.
	 * @description VIP - Cooldown is 250 milliseconds.
	 * @description Moderator - Cooldown is 50 milliseconds - Enables moderation mode
	 * @description Bot - Only the bot channel will have this.
	 */
	public Mode: PermissionMode;

	/**
	 * @description if live or not 4Head
	 */
	public Live: boolean;

	/**
	 * @description Last message in channel.
	 */
	public LastMessage: string = '';

	/**
	 * @description
	 */
	public UserCooldowns: Record<number, TUserCooldown[]>;

	/**
	 * @description Commands which can't be run in the channel.
	 */
	public Filter: string[];

	/**
	 * @description Trivia controller.
	 */
	public Trivia: TriviaController | null;

	/**
	 * @description Keep track of eventsub subscriptions for this channel.
	 */
	public EventSubs: EventSubHandler;

	static async New(user: User, Mode: PermissionMode, Live: boolean): Promise<Channel> {
		const Channel = new this(user, Mode, Live);
		await Channel.EventSubs.Done;
		return Channel;
	}

	static async CreateBot(): Promise<Channel> {
		const Creds = {
			name: Bot.Config.BotUsername,
			user_id: await Bot.Redis.SGet('SelfID'),
		};

		const user = await Bot.User.Get(Creds.user_id, Creds.name);

		await Bot.SQL.insertInto('channels')
			.values({
				name: Creds.name,
				user_id: Creds.user_id,
				bot_permission: 3,
			})
			.onConflict((table) => table.column('user_id').doNothing())
			.execute();

		return new this(user, 'Bot', false);
	}

	constructor(user: User, Mode: PermissionMode, Live: boolean) {
		this.Name = user.Name;
		this.Id = user.TwitchUID;
		this.Mode = Mode;
		this.Live = Live;
		this.UserCooldowns = {};

		this.Filter = [];
		this.Trivia = null;

		this.setupTrivia();

		this.EventSubs = new EventSubHandler(this, Bot.Redis);
	}

	async reply(
		msg: string,
		options: ChannelTalkOptions = {
			SkipBanphrase: false,
		},
	): Promise<void> {
		this.say(msg, options);
	}

	async say(
		msg: string,
		options: ChannelTalkOptions = {
			SkipBanphrase: false,
		},
	): Promise<void> {
		if (this.Mode === 'Read') return;

		const client = Bot.Twitch.Controller.client;

		let sayFunc: (msg: string) => void;
		switch (typeof options.ReplyID) {
			case 'string': {
				sayFunc = (msg) => client.reply(this.Name, options.ReplyID!, msg);
				break;
			}

			case 'undefined':
			default: {
				sayFunc = (msg) => client.privmsg(this.Name, msg);
			}
		}

		if (options.SkipBanphrase) {
			sayFunc(cleanMessage(msg));
			return;
		}

		try {
			const { banned, reason } = await CheckMessageBanphrase(this, msg);

			if (banned) {
				Bot.Log.Warn('Banphrase triggered %O', {
					Channel: this.Name,
					Message: msg,
					Reason: reason,
				});

				sayFunc(`FeelsDankMan Bad word -> ${reason}`);
			} else {
				sayFunc(cleanMessage(msg));
			}
		} catch (error) {
			Bot.Log.Error(error as Error, 'banphraseCheck');
			sayFunc('FeelsDankMan Banphrase check failed...');
		}

		// this.Queue.schedule(msg, options);
		this.LastMessage = msg;
	}

	/**
	 * @param user Username
	 * @param input Input
	 * @returns
	 */
	async tryTrivia(user: string, input: string[]): Promise<void> {
		if (!this.Trivia || !this.Trivia.initiated) return;

		this.Trivia.tryAnswer(user, input.join(' '));
	}

	async getEmoteSetID(): Promise<SevenTVChannelIdentifier | void> {
		const emoteSet = (
			await GetChannelData((await this.User()).TwitchUID, 'SevenTVEmoteSet')
		).ToString();

		if (emoteSet) {
			return {
				EmoteSet: emoteSet,
				Channel: this.Name,
			};
		}
	}

	private async setupTrivia(): Promise<void> {
		this.InitiateTrivia();
	}

	static async Join(user: User) {
		await Bot.SQL.transaction().execute(async (tx) => {
			await tx
				.insertInto('channels')
				.values({
					name: user.Name,
					user_id: user.TwitchUID,
					bot_permission: 1,
				})
				.execute();

			await tx
				.insertInto('stats')
				.values({
					name: user.Name,
					commands_handled: 0,
				})
				.execute();
		});

		try {
			await Bot.Twitch.Controller.client.join(user.Name);
			const channel = await Bot.Twitch.Controller.AddChannelList(user);
			const resp = await Promise.all([
				Helix.EventSub.Create('channel.update', {
					broadcaster_user_id: user.TwitchUID,
				}),
				Helix.EventSub.Create('stream.offline', {
					broadcaster_user_id: user.TwitchUID,
				}),
				Helix.EventSub.Create('stream.online', {
					broadcaster_user_id: user.TwitchUID,
				}),
			]);

			for (const r of resp) {
				if (r.err) {
					Bot.Log.Error('Failed to create eventsub for channel %O', {
						user: user.Name,
						err: r.inner,
					});
					continue;
				}

				for (const event of r.inner.data) {
					channel.EventSubs.Push(event);
				}
			}

			channel.say('FeelsDankMan 👋 Hi');
		} catch (err) {
			await Bot.Twitch.Controller.client.part(user.Name);
			throw err;
		}
	}

	async User(): Promise<User> {
		return Bot.User.Get(this.Id, this.Name);
	}

	async GetChannelData(key: string): Promise<DataStoreContainer>;
	async GetChannelData(key: ChannelDataNames): Promise<DataStoreContainer>;
	async GetChannelData(key: string | ChannelDataNames): Promise<DataStoreContainer> {
		return GetChannelData(this.Id, key);
	}

	async GetViewers(): Promise<string[]> {
		return JSON.parse(
			await Bot.Redis.SGet(`channel:${(await this.User()).TwitchUID}:viewers`),
		) as string[];
	}

	async UpdateName(newName: string): Promise<void> {
		try {
			await Bot.Twitch.Controller.client.part(this.Name);
			await Bot.Twitch.Controller.client.join(newName);
			await Bot.SQL.updateTable('channels')
				.set({
					name: newName,
				})
				.where('user_id', '=', this.Id)
				.execute();

			await Bot.Twitch.Controller.client.part(this.Name);
			this.Name = newName;
			await this.say('FeelsDankMan TeaTime');
		} catch (error) {
			Bot.Log.Error(error as Error, 'Failed to update name for %s', this.Name);
		}
	}

	async UpdateLive(): Promise<void> {
		this.Live = (await GetChannelData(this.Id, 'IsLive')).ToBoolean();
		return;
	}

	public getCooldown(id: number): TUserCooldown[] {
		return this.UserCooldowns[id];
	}

	public setCooldown(id: number, val: TUserCooldown): void {
		if (!this.UserCooldowns[id]) {
			this.UserCooldowns[id] = [val];
			return;
		}
		const idx = this.UserCooldowns[id].findIndex((channel) => channel.Command === val.Command);
		if (idx === -1) {
			this.UserCooldowns[id].push(val);
			return;
		} else this.UserCooldowns[id][idx] = val;
	}

	private async InitiateTrivia(): Promise<void> {
		this.Trivia = new TriviaController();

		this.Trivia.on('ready', (category: string, question: string, hasHint: boolean) => {
			this.say(
				`(Trivia) ThunBeast 👉 [${category}] ${question} ${
					hasHint ? `| MaxLOL ❓ 👉 ${Bot.Config.Prefix} hint` : ''
				}`,
				{ SkipBanphrase: false },
			);
		});

		this.Trivia.on('timeout', (answer: string) => {
			this.say(`(Trivia) SuperVinlin you guys suck! The answer was ${answer}`, {
				SkipBanphrase: false,
			});
		});

		this.Trivia.on('complete', (winner: string, answer: string, sim: number) => {
			this.say(
				`(Trivia) ThunBeast 📣 ${winner} won the trivia! The answer was ${answer} (${sim}% similarity)`,
				{ SkipBanphrase: false },
			);
		});

		this.Trivia.on('fail', () => {
			this.say('(Trivia) BrokeBack Trivia broken.', {
				SkipBanphrase: true,
			});
		});
	}
}

function permissionCheck(
	channel: Channel,
	command: CommandModel,
	user: User,
	privmsg: DankTwitch.PrivmsgMessage,
): boolean {
	const { badges } = privmsg;

	let userPermission = EPermissionLevel.VIEWER;
	userPermission = (badges.hasVIP && EPermissionLevel.VIP) || userPermission;

	userPermission = (badges.hasModerator && EPermissionLevel.MOD) || userPermission;

	userPermission =
		(channel.Id === user.TwitchUID && EPermissionLevel.BROADCAST) || userPermission;

	userPermission = (user.Role === 'admin' && EPermissionLevel.ADMIN) || userPermission;
	return command.Permission <= userPermission ? true : false;
}

export async function ExecuteCommand(
	channel: Channel,
	user: User,
	input: string[],
	commandName: string,
	extras: DankTwitch.PrivmsgMessage,
): Promise<{ message: string; flags: ChannelTalkOptions } | void> {
	try {
		const command = GetCommandBy(commandName);

		if (typeof command === 'undefined') return;

		if (command.OnlyOffline && channel.Live) {
			return;
		}

		const current = Date.now();

		const timeout = channel.getCooldown(user.ID);
		if (typeof timeout === 'object') {
			// User has done commands before, find the specific value for current command.
			const cr = timeout.find((time) => time.Command === command.Name);
			// If found and is still on cooldown we return.
			if (typeof cr !== 'undefined' && cr.TimeExecute > current) return;
		}

		// First time running command this instance or not on cooldown, so we set their cooldown.
		channel.setCooldown(user.ID, {
			Command: command.Name,
			TimeExecute: current + command.Cooldown * 1000,
			Cooldown: Bot.Config.Development ? 0 : command.Cooldown,
		});

		if (!permissionCheck(channel, command, user, extras)) {
			return;
		}

		const flags: ChannelTalkOptions = {
			SkipBanphrase: command.HasFlag(ECommandFlags.NoBanphrase),
			ReplyID: command.HasFlag(ECommandFlags.ResponseIsReply) ? extras.messageID : undefined,
		};

		const Return = (message: string) => {
			return { message, flags };
		};

		let argsResult: ArgsParseResult;
		try {
			argsResult = ParseArguments(input, command.Params);
		} catch (error) {
			/// Indicates that the input is invalid
			if (error instanceof ParseArgumentsError) {
				return Return(`❗ ${user.Name}: ${error.message}`);
			} else {
				return Return(`❗ ${user.Name}: An error occurred while parsing arguments.`);
			}
		}

		// Create context.
		const ctx: TCommandContext = {
			channel,
			user,
			input: argsResult.output,
			data: {
				Params: argsResult.values,
				User: extras,
			},
			Log: CommandLog(command.Name, channel.Name),
		};

		let mods: object;
		try {
			mods = await PreHandler.Fetch(ctx, command.PreHandlers);
		} catch (error) {
			if (error instanceof PreHandlerError) {
				return Return(`❗ ${user.Name}: ${error.message}`);
			} else {
				Bot.Log.Error(error as Error, 'PreHandler');

				return Return(`❗ ${user.Name}: An error occurred while running the command :(`);
			}
		}

		const doExecution = async (): Promise<[Insertable<CommandsExecutionTable>, string]> => {
			try {
				const data = await command.Execute(ctx, mods);
				const result: Insertable<CommandsExecutionTable> = {
					user_id: user.TwitchUID,
					username: user.Name,
					channel: channel.Id,
					success: data.Success ?? false,
					result: data.Result ?? '',
					args: ctx.input,
					command: command.Name,
				};

				if (!data.Result || !data.Result.length) return [result, ''];

				if (!data.Success) data.Result = `❗ ${data.Result}`;

				return [result, data.Result];
			} catch (error) {
				if (error instanceof Error) {
					Bot.Log.Error(error, 'Failed to run a command');
				}

				const isNotObject = () => typeof error !== 'object';

				let message: string = '';

				// prettier-ignore
				if (error instanceof InvalidInputError) 
                {
					message = error.message;
				} 
                else if (error instanceof ThirdPartyError) 
                {
                    // TODO: Leak to everybody?
                    message = error.message;
				}
                else if (error instanceof GetSafeError) 
                {
                    message = error.message;
                } 
                else if (isNotObject())
                {
                    message = (error)?.toString() ?? 'Unknown error';
                } 
                // FIXME: Missing non-error object, but whatever.
                else {
					if (user.HasSuperPermission()) {
                        message = getStringFromError(error as string);
					} else {
						message = 'FeelsDankMan command machine broken';
					}
                }
				// end prettier-ignore

				const result: Insertable<CommandsExecutionTable> = {
					user_id: user.TwitchUID,
					username: user.Name,
					channel: channel.Id,
					success: false,
					result: message,
					args: ctx.input,
					command: command.Name,
				};

				return [result, `❗ @${user.Name} ${message}`];
			}
		};

		const now = Date.now();
		const [result, toSay] = await doExecution();

		Bot.Log.Info(
			'Command %O executed in %i ms',
			{
				channel: channel.Name,
				user: user.Name,
				command: command.Name,
				params: argsResult.values,
			},
			Date.now() - now,
		);

		logCommandExecution(result);

		await sql`UPDATE stats SET commands_handled = commands_handled + 1 WHERE name = ${channel.Name}`.execute(
			Bot.SQL,
		);

		return Return(toSay);
	} catch (e) {
		Bot.Log.Error(e as Error, 'channel/tryCommand/catch');
		channel.say('BrokeBack command failed', {
			SkipBanphrase: true,
		});
	}
}

const cleanMessage = (message: string): string => message.replace(/(\r\n|\n|\r)/gm, ' ');
const getStringFromError = (error: Error | string): string => {
	switch (typeof error) {
		case 'object':
			if (error instanceof Error) return error.message;
			return cleanMessage(JSON.stringify(error)) ?? 'Unknown error';
		case 'string':
		case 'number':
			return error;
		default:
			return 'Unknown error';
	}
};

const CommandLog = (name: string, channel: string): CommandLogFn => {
	// TODO: Error class handling.

	return (type: CommandLogType = 'info', data = '', ...rest: any[]) => {
		switch (type) {
			case 'info': {
				Bot.Log.Info(`[Command - %s] %s %O %O`, channel, name, data, ...rest);
				break;
			}
			case 'error': {
				Bot.Log.Error(`[Command/%s/%s] %O %O`, name, channel, data, ...rest);
				break;
			}
		}
	};
};

export class EventSubHandler {
	private _subscriptions: EventSubSubscription[] = [];
	private readonly _redisKey = (userid: string) => `channel:${userid}:eventsub`;
	private isReady: IPromolve<void> = Promolve();

	constructor(private readonly _channel: Channel, private readonly _redis: RedisSingleton) {
		const key = this._redisKey(this._channel.Id);

		this._redis.HGetAll(key).then((data) => {
			if (!data) return;

			for (const [lhs, preRhs] of Object.entries(data)) {
				const rhs = JSON.parse(preRhs) as {
					status: EventSubFulfilledStatus;
					type: EventsubTypes;
				};

				const subscription = new EventSubSubscription(lhs, rhs.status, rhs.type);

				this._subscriptions.push(subscription);
			}

			this.isReady.resolve();
		});
	}

	public get Done() {
		return this.isReady.promise;
	}

	public Push<T extends object>({ id, status, type }: CreateEventSubResponse<T>['data'][0]) {
		const subscription = new EventSubSubscription(id, status, type);
		const [field, value] = subscription.toRedis();

		this._redis.HSet(this._redisKey(this._channel.Id), field, value).then(() => {
			this._subscriptions.push(subscription);
		});
	}

	public GetSubscription(type?: EventsubTypes): EventSubSubscription[] | null {
		if (!type) return this._subscriptions;

		return this._subscriptions.filter((sub) => sub.Type() === type);
	}
}

function logCommandExecution(resulton: Insertable<CommandsExecutionTable>) {
	return Bot.SQL.insertInto('logs.commands_execution').values(resulton).execute();
}
