import { TUserCooldown, ChannelTalkOptions } from './../../Typings/types';
import { EPermissionLevel, ECommandFlags } from './../../Typings/enums.js';
import { CheckMessageBanphrase } from './../Banphrase/index.js';
import * as tools from './../../tools/tools.js';
import { Result, Err, Ok } from './../../tools/result.js';
import { MessageScheduler } from './../../tools/MessageScheduler.js';
import DankTwitch from '@kararty/dank-twitch-irc';
import {
	CommandModel,
	TCommandContext,
	ParseArgumentsError,
	ArgsParseResult,
	SafeResponseError,
	CommandLogFn,
	CommandLogType,
} from '../../Models/Command.js';
import TriviaController from './../Trivia/index.js';
import { SevenTVChannelIdentifier } from './../Emote/SevenTV/EventAPI';
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
import {
	PermissionMode,
	PermissionModeToCooldown,
	PermissionModeToDatabase,
} from '../DB/Tables/ChannelTable.js';

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
	 * @description The value of Mode just in number format
	 */
	public Cooldown: number;

	/**
	 * @description if live or not 4Head
	 */
	public Live: boolean;

	/**
	 * @description Message queue for the channel, this let's the bot abide by the Cooldown rule.
	 */
	public Queue: MessageScheduler;

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

	static async WithEventsub(channel: Channel, emoteSetID?: string): Promise<Channel> {
		let identifier: SevenTVChannelIdentifier | undefined = undefined;
		if (emoteSetID) {
			identifier = {
				Channel: channel.Name,
				EmoteSet: emoteSetID ?? undefined,
			};
		}

		await channel.joinEventSub(identifier);
		return channel;
	}

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
				live: false,
			})
			.onConflict((table) => table.column('user_id').doNothing())
			.execute();

		return new this(user, 'Bot', false);
	}

	constructor(user: User, Mode: PermissionMode, Live: boolean) {
		this.Name = user.Name;
		this.Id = user.TwitchUID;
		this.Mode = Mode;
		this.Cooldown = PermissionModeToCooldown(Mode) ?? 1250;
		this.Live = Live;
		this.Queue = new MessageScheduler();
		this.UserCooldowns = {};

		this.Filter = [];
		this.Trivia = null;

		this.setupTrivia();

		// Create callback for the message queue.
		this.Queue.on('message', (a, b) => this.onQueue(a, b));
		this.EventSubs = new EventSubHandler(this, Bot.Redis);
	}

	async say(
		msg: string,
		options: ChannelTalkOptions = {
			SkipBanphrase: false,
		},
	): Promise<void> {
		if (this.LastMessage === msg) {
			const { messageEvasionCharacter } = Bot.Config.StaticData;
			if (msg.includes(messageEvasionCharacter))
				msg = msg.replace(new RegExp(messageEvasionCharacter), '');
			else msg += ` ${messageEvasionCharacter}`;
		}

		this.Queue.schedule(msg, options, this.Cooldown);
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

	/**
	 * @param user The user
	 * @param input The input
	 * @param extras Extra Twitch data related to the user.
	 * @returns
	 */
	async tryCommand(
		user: User,
		input: string[],
		commandName: string,
		extras: DankTwitch.PrivmsgMessage,
	): Promise<{ message: string; flags: ChannelTalkOptions } | void> {
		try {
			const command = await Bot.Commands.get(commandName);

			if (typeof command === 'undefined') return;

			if (command.OnlyOffline && this.Live) {
				return;
			}

			const current = Date.now();

			const timeout = this.getCooldown(user.ID);
			if (typeof timeout === 'object') {
				// User has done commands before, find the specific value for current command.
				const cr = timeout.find((time) => time.Command === command.Name);
				// If found and is still on cooldown we return.
				if (typeof cr !== 'undefined' && cr.TimeExecute > current) return;
			}

			// First time running command this instance or not on cooldown, so we set their cooldown.
			this.setCooldown(user.ID, {
				Command: command.Name,
				TimeExecute: current + command.Cooldown * 1000,
				Cooldown: Bot.Config.Development ? 0 : command.Cooldown,
			});

			if (!this.permissionCheck(command, user, extras)) {
				return;
			}

			const copy = [...input];

			let argsResult: ArgsParseResult;
			try {
				argsResult = CommandModel.ParseArguments(copy, command.Params);
			} catch (error) {
				/// Indicates that the input is invalid
				if (error instanceof ParseArgumentsError) {
					this.say(`❗ ${user.Name}: ${error.message}`, { SkipBanphrase: true });
					return;
				} else {
					this.say(`❗ ${user.Name}: An error occurred while parsing arguments.`, {
						SkipBanphrase: true,
					});
					return;
				}
			}

			// Create context.
			const ctx: TCommandContext = {
				channel: this,
				user: user,
				input: argsResult.output,
				data: {
					Params: argsResult.values,
					User: extras,
				},
				Log: CommandLog(command.Name, this.Name),
			};

			let mods: object;
			try {
				mods = await PreHandler.Fetch(ctx, command.PreHandlers);
			} catch (error) {
				if (error instanceof SafeResponseError) {
					this.say(`❗ ${user.Name}: ${error.message}`, { SkipBanphrase: true });
				} else {
					Bot.Log.Error(error as Error, 'PreHandler');

					this.say(`❗ ${user.Name}: An error occurred while running the command :(`, {
						SkipBanphrase: true,
					});
				}

				return;
			}

			const doExecution = async (): Promise<[Insertable<CommandsExecutionTable>, string]> => {
				try {
					const data = await command.Execute(ctx, mods);
					const result: Insertable<CommandsExecutionTable> = {
						user_id: user.TwitchUID,
						username: user.Name,
						channel: this.Id,
						success: data.Success ?? false,
						result: data.Result ?? '',
						args: ctx.input,
						command: command.Name,
					};

					if (!data.Result || !data.Result.length) return [result, ''];

					if (command.Ping) data.Result = `@${user.Name}, ${data.Result}`;

					if (!data.Success) data.Result = `❗ ${data.Result}`;

					return [result, data.Result];
				} catch (error) {
					Bot.Log.Error(error as Error, 'command/run/catch');
					const extractedError = getStringFromError(error as string | Error);

					if (user.HasSuperPermission()) {
						this.say(`❗ ${user.Name}: ${extractedError}`, {
							SkipBanphrase: true,
						});
					} else {
						this.say('PoroSad Command Failed...', {
							SkipBanphrase: true,
						});
					}

					const result: Insertable<CommandsExecutionTable> = {
						user_id: user.TwitchUID,
						username: user.Name,
						channel: this.Id,
						success: false,
						result: extractedError,
						args: ctx.input,
						command: command.Name,
					};

					return [result, ''];
				}
			};

			const [result, toSay] = await doExecution();

			logCommandExecution(result);

			await sql`UPDATE stats SET commands_handled = commands_handled + 1 WHERE name = ${this.Name}`.execute(
				Bot.SQL,
			);

			return {
				message: toSay,
				flags: {
					SkipBanphrase: command.HasFlag(ECommandFlags.NO_BANPHRASE),
				},
			};
		} catch (e) {
			Bot.Log.Error(e as Error, 'channel/tryCommand/catch');
			this.say('BrokeBack command failed', {
				SkipBanphrase: true,
			});
		}
	}

	async VanishUser(username: string): Promise<void> {
		await Bot.Twitch.Controller.client.timeout(this.Name, username, 1, 'Vanish Command Issued');
	}

	/**
	 * Listen for 7TV eventsub messages
	 * Will only be enabled if the channel has the setting checked
	 */
	async joinEventSub(emoteSetID?: SevenTVChannelIdentifier): Promise<void> {
		const settings = await GetSettings(this.User());

		const eventsub = settings.Eventsub.ToBoolean();
		if (!eventsub) return;

		if (!emoteSetID) {
			const e = settings.SevenTVEmoteSet.ToString();
			if (!e) return;
			emoteSetID = {
				EmoteSet: e,
				Channel: this.Name,
			};
		}

		if (!emoteSetID) {
			return;
		}

		Bot.Twitch.Emotes.SevenTVEvent.addChannel(emoteSetID);
	}

	async leaveEventSub(emoteSetID?: SevenTVChannelIdentifier): Promise<void> {
		if (!emoteSetID) {
			try {
				const e = await this.getEmoteSetID();
				if (!e) return;
				emoteSetID = e;
			} catch (error) {
				Bot.Log.Error(error as Error, 'channel/leaveEventSub');
				return;
			}
		}

		Bot.Twitch.Emotes.SevenTVEvent.removeChannel(emoteSetID);
	}

	async getEmoteSetID(): Promise<SevenTVChannelIdentifier | void> {
		const settings = await GetSettings(this.User());

		if (settings.SevenTVEmoteSet) {
			return {
				EmoteSet: settings.SevenTVEmoteSet.ToString(),
				Channel: this.Name,
			};
		}
	}

	private async onQueue(message: string, options: ChannelTalkOptions): Promise<void> {
		if (this.Mode === 'Read') return;

		const client = Bot.Twitch.Controller.client;

		if (options.SkipBanphrase) {
			client.privmsg(this.Name, cleanMessage(message));
			return;
		}

		try {
			const { banned, reason } = await CheckMessageBanphrase(this, message);

			if (banned) {
				Bot.Log.Warn('Banphrase triggered %O', {
					Channel: this.Name,
					Message: message,
					Reason: reason,
				});

				client.privmsg(this.Name, `FeelsDankMan Bad word -> ${reason}`);
			} else {
				client.privmsg(this.Name, message);
			}
		} catch (error) {
			Bot.Log.Error(error as Error, 'banphraseCheck');
			client.privmsg(this.Name, 'FeelsDankMan Banphrase check failed...');
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
					live: false,
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

	// On self messages.
	async UpdateAll(user: DankTwitch.PrivmsgMessage): Promise<void> {
		const { badges } = user;

		// Moderator
		if (badges.hasModerator || badges.hasBroadcaster) {
			await this.setPermissionMode('Moderator');
		}
		// Vip
		else if (badges.hasVIP) {
			await this.setPermissionMode('VIP');
		}
		// Default user
		else if (this.Mode !== 'Read' && !badges.hasModerator && !badges.hasVIP) {
			await this.setPermissionMode('Write');
		}
	}

	async User(): Promise<User> {
		return Bot.User.Get(this.Id, this.Name);
	}

	async GetViewers(): Promise<string[]> {
		return JSON.parse(
			await Bot.Redis.SGet(`channel:${(await this.User()).TwitchUID}:viewers`),
		) as string[];
	}

	public async GetSettings(): Promise<ChannelSettings> {
		return GetSettings(this.User());
	}

	public async ReflectSettings(): Promise<void> {
		const settings = await GetSettings(this.User());

		if (!settings) return;

		const eventsub = settings.Eventsub.ToBoolean();

		if (eventsub !== undefined) {
			switch (eventsub) {
				case true:
					await this.joinEventSub();
					break;
				case false:
					await this.leaveEventSub();
					break;
			}
		}
	}

	public async setPermissionMode(mode: PermissionMode) {
		const asDatabase = PermissionModeToDatabase(mode);

		await Bot.SQL.updateTable('channels')
			.set({
				bot_permission: asDatabase,
			})
			.where('user_id', '=', this.Id)
			.execute();

		this.Mode = mode;
		this.Cooldown = PermissionModeToCooldown(mode) ?? 1250;

		Bot.Log.Info('%s is now set as %s.', this.Name, mode);
	}

	async UpdateName(newName: string): Promise<void> {
		try {
			await Bot.Twitch.Controller.TryRejoin(this, newName);
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
		this.Live = await tools.Live(this.Id);
		return;
	}

	private getCooldown(id: number): TUserCooldown[] {
		return this.UserCooldowns[id];
	}

	private setCooldown(id: number, val: TUserCooldown): void {
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

	AutomodMessage(message: string): void {
		if (this.Queue.hasMessage) {
			this.say(message, { SkipBanphrase: true });
		}
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

	private permissionCheck(
		command: CommandModel,
		user: User,
		privmsg: DankTwitch.PrivmsgMessage,
	): boolean {
		const { badges } = privmsg;

		let userPermission = EPermissionLevel.VIEWER;
		userPermission = (badges.hasVIP && EPermissionLevel.VIP) || userPermission;

		userPermission = (badges.hasModerator && EPermissionLevel.MOD) || userPermission;

		userPermission =
			(this.Id === user.TwitchUID && EPermissionLevel.BROADCAST) || userPermission;

		userPermission = (user.Role === 'admin' && EPermissionLevel.ADMIN) || userPermission;
		return command.Permission <= userPermission ? true : false;
	}
}

const cleanMessage = (message: string): string => message.replace(/(\r\n|\n|\r)/gm, ' ');
const getStringFromError = (error: Error | string): string => {
	switch (typeof error) {
		case 'object':
			if (error instanceof Error) return error.message;
			return JSON.stringify(error)?.replace(/(\r\n|\n|\r)/gm, ' ') ?? 'Unknown error';
		case 'string':
		case 'number':
			return error;
		default:
			return 'Unknown error';
	}
};

export const GetSettings = async (channel: User | Promise<User>): Promise<ChannelSettings> => {
	const done: ChannelSettings = {
		Eventsub: DefaultChannelSetting(),
		SevenTVEmoteSet: DefaultChannelSetting(),
		FollowMessage: DefaultChannelSetting(),
		Pajbot1: DefaultChannelSetting(),
	};

	const state = await Bot.Redis.HGetAll(`channel:${(await channel).TwitchUID}:settings`);

	if (!state) {
		return done;
	}

	for (const [key, value] of Object.entries(state)) {
		done[key as ChannelSettingsNames] = new ChannelSettingsValue(value);
	}

	return new Proxy(done, {
		get: (target, prop) => {
			if (prop in target) return target[prop as ChannelSettingsNames];
			return new ChannelSettingsValue('');
		},
	});
};

export async function UpdateSetting(
	user: User | Promise<User>,
	name: ChannelSettingsNames,
	value: ChannelSettingsValue,
): Promise<void> {
	const ID = (await user).TwitchUID;

	const key = `channel:${ID}:settings`;

	await Bot.Redis.HSet(key, name, value.ToString());

	Bot?.Twitch?.Controller?.TwitchChannelSpecific({ ID })?.ReflectSettings();
}

export async function DeleteSetting(
	user: User | Promise<User>,
	name: ChannelSettingsNames,
): Promise<void> {
	const ID = (await user).TwitchUID;

	const key = `channel:${ID}:settings`;

	await Bot.Redis.HDel(key, name);

	Bot?.Twitch?.Controller?.TwitchChannelSpecific({ ID })?.ReflectSettings();
}

// export async function Get() {
//     const isIn = await Bot.SQL.Query`
//     SELECT name FROM channels
//     WHERE user_id = ${this.TwitchUID}
// `.then((res) => {
//     return res.length > 0;
// });

// if (!isIn) {
//     return false;
// }

// return GetSettings(this);
// }

export type ChannelSettingsNames = 'Eventsub' | 'SevenTVEmoteSet' | 'FollowMessage' | 'Pajbot1';

export type ChannelSettings = {
	[key in ChannelSettingsNames]: ChannelSettingsValue;
};

export class ChannelSettingsValue {
	static FromUnknown(value: unknown): ChannelSettingsValue {
		switch (typeof value) {
			case 'string':
				return new ChannelSettingsValue(value);
			case 'number':
			case 'boolean':
				return new ChannelSettingsValue(value.toString());
			default:
				return new ChannelSettingsValue(JSON.stringify(value));
		}
	}

	constructor(protected value: string) {}

	public ToJSON<Obj extends object>(): Result<Obj, string> {
		try {
			return new Ok(JSON.parse(this.value));
		} catch (e) {
			return Err.NormalizeError(e);
		}
	}

	public ToBoolean(): boolean {
		return this.value === 'true';
	}

	public ToNumber(): number {
		return Number(this.value) || 0;
	}

	public ToString(): string {
		return this.value;
	}
}

const DefaultChannelSetting = () => new ChannelSettingsValue('');

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
