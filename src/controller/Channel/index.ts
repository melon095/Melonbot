import {
	Database,
	NChannel,
	TCommandContext,
	TUserCooldown,
	ChannelTalkOptions,
	TParamsContext,
} from './../../Typings/types';
import { EPermissionLevel, ECommandFlags } from './../../Typings/enums.js';
import { Banphrase } from './../Banphrase/index.js';
import * as tools from './../../tools/tools.js';
import { MessageScheduler } from './../../tools/MessageScheduler.js';
import { ChatUserstate } from 'tmi.js';
import { CommandModel } from '../../Models/Command.js';
import { ModerationModule } from './../../Modules/Moderation.js';
import TriviaController from './../Trivia/index.js';
import { SevenTVChannelIdentifier } from './../Emote/SevenTV/EventAPI';

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
	public Mode: NChannel.Mode;

	/**
	 * @description The value of Mode just in number format
	 */
	public Cooldown: number;

	/**
	 * @description Channels banphrases
	 */
	public Banphrase: Banphrase;

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
	public LastMessage: string;

	/**
	 * @description
	 */
	public UserCooldowns: Record<number, TUserCooldown[]>;

	/**
	 * @description If the bot is moderator enable to moderation module for this chat.
	 */
	public ModerationModule: ModerationModule | null;

	/**
	 * @description Commands which can't be run in the channel.
	 */
	public Filter: string[];

	/**
	 * @description Trivia controller.
	 */
	public Trivia: TriviaController | null;

	static async WithEventsub(
		Name: string,
		Id: string,
		Mode: NChannel.Mode,
		Live: boolean,
	): Promise<Channel> {
		const channel = new this(Name, Id, Mode, Live);
		await channel.joinEventSub();
		return channel;
	}

	static async CreateBot(): Promise<Channel> {
		const Creds = {
			name: Bot.Config.BotUsername,
			user_id: await Bot.Redis.SGet('SelfID'),
		};

		await Bot.SQL.Query`
            INSERT INTO channels (name, user_id, bot_permission) 
            VALUES (${Creds.name}, ${Creds.user_id}, ${3}) 
            ON CONFLICT (user_id) DO NOTHING;`;

		return new this(Creds.name, Creds.user_id, 'Bot', false);
	}

	constructor(Name: string, Id: string, Mode: NChannel.Mode, Live: boolean) {
		this.Name = Name;
		this.Id = Id;
		this.Mode = Mode;
		this.Cooldown = tools.NChannelFunctions.ModeToCooldown(Mode) ?? 1250;
		this.Banphrase = new Banphrase(Name);
		this.Live = Live;
		this.Queue = new MessageScheduler();
		this.LastMessage = '';
		this.UserCooldowns = {};
		if (Mode === 'Moderator') {
			this.ModerationModule = new ModerationModule(this);
		} else {
			this.ModerationModule = null;
		}

		this.Filter = [];
		this.Trivia = null;

		this.setupTrivia();

		// Create callback for the message queue.
		this.Queue.on('message', (a, b) => this.onQueue(a, b));
	}

	async say(
		msg: string,
		options: ChannelTalkOptions = {
			NoEmoteAtStart: false,
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

	async tryTrivia(user: ChatUserstate, input: string[]): Promise<void> {
		if (!this.Trivia || !this.Trivia.initiated) return Promise.resolve();

		this.Trivia.tryAnswer(user, input.join(' '));
	}

	async tryCommand(user: ChatUserstate, _command: string, input: string[]): Promise<void> {
		try {
			/*
                Checks if mode is read, allows the owner to use commands there.
                Or if the command is in the filter.
            */
			if (
				(this.Mode === 'Read' && user['user-id'] !== Bot.Config.OwnerUserID) ||
				this.Filter.includes(input[1])
			) {
				return Promise.resolve();
			}

			const command = await Bot.Commands.get(_command);

			if (typeof command === 'undefined') return;

			if (command.OnlyOffline && this.Live) {
				return;
			}

			const current = Date.now();

			const timeout = this.GetCooldown(Number(user['user-id']));
			if (typeof timeout === 'object') {
				// User has done commands before, find the specific value for current command.
				const cr = timeout.find((time) => time.Command === command.Name);
				// If found and is still on cooldown we return.
				if (typeof cr !== 'undefined' && cr.TimeExecute > current) return;
			}

			// First time running command this instance or not on cooldown, so we set their cooldown.
			this.SetCooldown(Number(user['user-id']), {
				Command: command.Name,
				TimeExecute: current + command.Cooldown * 1000,
				Cooldown: Bot.Config.Development ? 0 : command.Cooldown,
			});

			if (!this.permissionCheck(command, user)) {
				return;
			}

			const copy = [...input];
			const values: TParamsContext = {};

			// Setup default data to params.
			for (const param of command.Params) {
				switch (param.type) {
					case 'string': {
						values[param.name] = '';
						break;
					}

					case 'boolean': {
						values[param.name] = false;
						break;
					}
				}
			}

			for (const [idx, word] of input.entries()) {
				if (word.slice(0, 2) === '--') {
					const paramType = command.Params.find((param) =>
						word.slice(2, word.length).includes(param.name),
					);
					if (paramType !== undefined) {
						switch (paramType.type) {
							case 'string': {
								const value = word.slice(word.indexOf('=') + 1, word.length);
								values[word.slice(2, word.indexOf('=', 3))] = value.toString();
								break;
							}
							case 'boolean': {
								values[paramType.name] = true;
								break;
							}
						}
						copy.splice(idx, 1);
					}
				}
			}

			const ArgsParseResult = {
				input: copy,
				params: values,
			};

			// Create context.
			const ctx: TCommandContext = {
				channel: this,
				user: user,
				input: ArgsParseResult.input,
				data: {
					Params: ArgsParseResult.params,
				},
			};

			const result = command.Execute(ctx);

			result.then((data) => {
				if (!data || data.length === 0) return;

				if (command.Ping) data = `@${user['display-name']}, ${data}`;

				this.say(data, {
					SkipBanphrase: command.Flags.includes(ECommandFlags.NO_BANPHRASE),
					NoEmoteAtStart: command.Flags.includes(ECommandFlags.NO_EMOTE_PREPEND),
				});

				const Result: CommandExecutionResult = {
					user_id: ctx.user['user-id']!,
					username: ctx.user.username!,
					channel: this.Id,
					success: true,
					result: data,
					args: ctx.input,
					command: command.Name,
				};

				this.logCommandExecution(Result);
			});

			result.catch((error) => {
				Bot.HandleErrors('command/run/catch', error);
				this.say('PoroSad Command Failed...');

				const Result: CommandExecutionResult = {
					user_id: ctx.user['user-id']!,
					username: ctx.user.username!,
					channel: this.Id,
					success: false,
					result: JSON.stringify(error),
					args: ctx.input,
					command: command.Name,
				};

				this.logCommandExecution(Result);
			});

			Bot.SQL
				.Query`UPDATE stats SET commands_handled = commands_handled + 1 WHERE name = ${this.Name}`;
		} catch (e) {
			Bot.HandleErrors('channel/tryCommand/catch', new Error(e as never));
			this.say('BrokeBack command failed', {
				SkipBanphrase: true,
				NoEmoteAtStart: true,
			});
		}
	}

	async joinEventSub(emoteSetID?: SevenTVChannelIdentifier): Promise<void> {
		if (this.Mode === 'Moderator' || this.Mode === 'VIP') {
			if (!emoteSetID) {
				try {
					const e = await this.getEmoteSetID();
					if (!e) return;
					emoteSetID = e;
				} catch (error) {
					Bot.HandleErrors('channel/joinEventSub', error as Error);
					return;
				}
			}

			Bot.Twitch.Emotes.SevenTVEvent.addChannel(emoteSetID);
		}
	}

	async leaveEventsub(emoteSetID?: SevenTVChannelIdentifier): Promise<void> {
		if (!emoteSetID) {
			try {
				const e = await this.getEmoteSetID();
				if (!e) return;
				emoteSetID = e;
			} catch (error) {
				Bot.HandleErrors('channel/leaveEventSub', error as Error);
				return;
			}
		}

		Bot.Twitch.Emotes.SevenTVEvent.removeChannel(emoteSetID);
	}

	async getEmoteSetID(): Promise<SevenTVChannelIdentifier | void> {
		const channel = await Bot.Twitch.Controller.GetChannel(this.Id);
		if (!channel) throw new Error('Channel not found');
		if (!channel.seventv_emote_set) return;
		else {
			return {
				EmoteSet: channel.seventv_emote_set,
				Channel: channel.name,
			};
		}
	}

	private async onQueue(message: string, options: ChannelTalkOptions): Promise<void> {
		let result = message;
		if (!options.NoEmoteAtStart) result = `👤 ${message}`;

		if (!options.SkipBanphrase) {
			this.Banphrase.Check(message)
				.then((IsBanned) => {
					if (!IsBanned.okay) {
						Bot.Twitch.Controller.client.say('#' + this.Name, result);
					} else {
						console.log({
							What: 'Received bad word in channel',
							Channel: this.Name,
							Message: message,
							Reason: IsBanned.reason,
						});

						Bot.Twitch.Controller.client.say(this.Name, 'cmonBruh bad word.');
					}
				})
				.catch((error) => {
					Bot.HandleErrors('banphraseCheck', new Error(error as never));
					Bot.Twitch.Controller.client.say(
						this.Name,
						'PoroSad unable to verify message against banphrase api.',
					);
				});
		} else {
			Bot.Twitch.Controller.client.say('#' + this.Name, result);
		}
	}

	private async setupTrivia(): Promise<void> {
		const filter = await Bot.SQL.Query<Database.channels[]>`
            SELECT disabled_commands 
            FROM channels
            WHERE user_id = ${this.Id}`;

		if (filter.length) {
			this.Filter = filter[0].disabled_commands;
			if (!filter[0].disabled_commands.includes('trivia')) {
				this.InitiateTrivia();
			}
		} else this.InitiateTrivia();
	}

	static async Join(username: string, user_id: string) {
		const queries = [];

		await Bot.SQL.Query`INSERT INTO channels (name, user_id) VALUES (${username}, ${user_id})`;

		queries.push(Bot.SQL.Query`INSERT INTO stats (name) VALUES (${username})`);

		queries.push(Bot.SQL.Query`INSERT INTO banphrases VALUES (${username}, ${'[]'})`);

		const triviaValues: Database.trivia = {
			channel: username,
			user_id: user_id,
			cooldown: 60000,
			filter: { exclude: [], include: [] },
			leaderboard: [],
		};

		queries.push(
			Bot.SQL.Query`
                INSERT INTO trivia ${Bot.SQL.Get(triviaValues)}`,
		);

		await Promise.all(queries).catch((e) => {
			Bot.HandleErrors('channel/join', e);
			throw '';
		});

		try {
			await Bot.Twitch.Controller.client.join('#' + username);
			const channel = await Bot.Twitch.Controller.AddChannelList(username!, user_id);
			channel.say('ApuApustaja 👋 Hi');
			// await Helix.EventSub.Create('channel.moderator.add', '1', {
			// 	broadcaster_user_id: ctx.user.id,
			// });

			// await Helix.EventSub.Create(
			// 	'channel.moderator.remove',
			// 	'1',
			// 	{
			// 		broadcaster_user_id: ctx.user.id,
			// 	},
			// );
			return;
		} catch (err) {
			Bot.HandleErrors('Join', err as Error);
			throw '';
		}
	}

	async updateFilter(): Promise<void> {
		const [filter] = await Bot.SQL.Query<Database.channels[]>`
            SELECT disabled_commands 
            FROM channels 
            WHERE user_id = ${this.Id}`;

		if (!filter) this.Filter = [];
		else this.Filter = filter.disabled_commands;
	}

	// On self messages.
	async UpdateAll(user: ChatUserstate): Promise<void> {
		// Moderator
		if (user.mod) {
			this.setMod();
		}
		// Vip
		else if (user.badges?.vip?.length) {
			this.setVip();
		}
		// Default user
		else if (this.Mode !== 'Read' && !user.mod && !user.badges?.vip?.length) {
			this.setNorman();
		}
	}

	setMod(): void {
		if (this.Mode === 'Moderator') return;
		this.Mode = 'Moderator';
		this.Cooldown = tools.NChannelFunctions.ModeToCooldown('Moderator') ?? 1250;
		Bot.SQL.Query`UPDATE channels SET bot_permission = ${3} WHERE user_id = ${
			this.Id
		}`.execute();
		this.ModerationModule = new ModerationModule(this);
		this.joinEventSub();
		console.info("Channel '" + this.Name + "' is now set as Moderator.");
	}

	setVip(): void {
		if (this.Mode === 'VIP') return;
		this.Mode = 'VIP';
		this.Cooldown = tools.NChannelFunctions.ModeToCooldown('VIP') ?? 1250;
		Bot.SQL.Query`UPDATE channels SET bot_permission = ${2} WHERE user_id = ${
			this.Id
		}`.execute();
		this.ModerationModule = null;
		this.joinEventSub();
		console.info("Channel '" + this.Name + "' is now set as VIP.");
	}

	// Norman meaning.. Normal. WutFace
	setNorman(): void {
		if (this.Mode === 'Write') return;
		this.Mode = 'Write';
		this.Cooldown = tools.NChannelFunctions.ModeToCooldown('Write') ?? 1250;
		Bot.SQL.Query`UPDATE channels SET bot_permission = ${1} WHERE user_id = ${
			this.Id
		}`.execute();
		this.ModerationModule = null;
		this.leaveEventsub();
		console.info("Channel '" + this.Name + "' is now set as Norman.");
	}

	async UpdateLive(): Promise<void> {
		this.Live = await tools.Live(this.Id);
		return;
	}

	setMode(mode: NChannel.Mode): void {
		this.Mode = mode;
	}

	setLive(_live: boolean): void {
		this.Live = _live;
	}

	GetCooldown(id: number): TUserCooldown[] {
		return this.UserCooldowns[id];
	}

	SetCooldown(id: number, val: TUserCooldown): void {
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

	AutomodMessage(message: string, userstate: 'msg_rejected' | 'msg_rejected_mandatory'): void {
		if (this.Queue.hasMessage && userstate === 'msg_rejected_mandatory') {
			this.say(message, { SkipBanphrase: true });
			return;
		}
	}

	async logCommandExecution(result: CommandExecutionResult): Promise<void> {
		await Bot.SQL.Query`
            INSERT INTO logs.commands_execution ${Bot.SQL.Get(result)}
        `;
	}

	private async InitiateTrivia(): Promise<void> {
		this.Trivia = new TriviaController();

		this.Trivia.on('ready', (category: string, question: string, hasHint: boolean) => {
			this.say(
				`(Trivia) ThunBeast 👉 [${category}] ${question} ${
					hasHint ? `| MaxLOL ❓ 👉 ${Bot.Config.Prefix} hint` : ''
				}`,
				{ NoEmoteAtStart: true, SkipBanphrase: false },
			);
		});

		this.Trivia.on('timeout', (answer: string) => {
			this.say(`(Trivia) SuperVinlin you guys suck! The answer was ${answer}`, {
				NoEmoteAtStart: true,
				SkipBanphrase: false,
			});
		});

		this.Trivia.on('complete', (winner: string, answer: string, sim: number) => {
			this.say(
				`(Trivia) ThunBeast 📣 ${winner} won the trivia! The answer was ${answer} (${sim}% similarity)`,
				{ NoEmoteAtStart: true, SkipBanphrase: false },
			);
		});

		this.Trivia.on('fail', () => {
			this.say('(Trivia) BrokeBack Trivia broken.', {
				NoEmoteAtStart: true,
				SkipBanphrase: true,
			});
		});
	}

	private permissionCheck(command: CommandModel, user: ChatUserstate): boolean {
		let userPermission = EPermissionLevel.VIEWER;
		userPermission = (user.badges?.vip && EPermissionLevel.VIP) || userPermission;
		userPermission =
			((user.mod || user['user-type'] === 'mod') && EPermissionLevel.MOD) || userPermission;
		userPermission =
			(this.Id === user['user-id'] && EPermissionLevel.BROADCAST) || userPermission;
		userPermission =
			(Bot.Twitch.Controller.admins.find((name) => name === user.username) !== undefined &&
				EPermissionLevel.ADMIN) ||
			userPermission;
		return command.Permission <= userPermission ? true : false;
	}
}

export interface CommandExecutionResult {
	user_id: string;
	username: string;

	channel: string;

	success: boolean;

	command: string;
	args: string[];
	result: string;
}
