import tmi, { ChatUserstate } from 'tmi.js';
import * as tools from './tools/tools.js';
import fs from 'node:fs';
import { __loops } from './loops/loops.js';
import { Channel } from './controller/Channel/index.js';
import got from './tools/Got.js';
import { Promolve, IPromolve } from '@melon95/promolve';
import EventSubTriggers from './triggers/eventsub/index.js';
import { Database } from './Typings/types.js';

interface IUserInformation {
	data: [
		{
			id: string;
			login: string;
			name: string;
			type: string;
			broadcaster_type: string;
			description: string;
			profile_image_url: string;
			offline_image_url: string;
			view_count: number;
			email?: string;
			created_at: string;
		},
	];
}

interface IWhisperUser {
	ID: string;
	Username: string;
}

export default class Twitch {
	public client!: tmi.Client;
	public admins!: string[];
	public owner!: string;

	public channels: Channel[] = [];

	private initFlags: [boolean, boolean] = [false, false];
	private InitReady: IPromolve<boolean> = Promolve<boolean>();

	private constructor() {
		this.InitFulfill();

		this.client = new tmi.client({
			options: {
				debug: Bot.Config.Development, // Use this to console.log chat messages
				joinInterval: Bot.Config.Verified ? 300 : 2000,
			},
			identity: {
				username: Bot.Config.BotUsername,
				password: Bot.Config.Twitch.OAuth,
			},
			connection: {
				reconnect: true,
				maxReconnectAttempts: 5,
				reconnectInterval: 1000,
				secure: true,
			},
		});
		this.admins = JSON.parse(fs.readFileSync('./admins.json', { encoding: 'utf-8' }));

		this._setupRedisCallbacks();

		(async () => {
			__loops();
		})();
	}

	static async Init() {
		const t = new Twitch();

		await t.SetOwner();

		t.owner = '';
		try {
			await t.client.connect();
		} catch (err) {
			console.log('Failed to connect to Twitch', err);
			process.exit(1);
		}

		t.client.on('connected', async (addr: string, port: number) => {
			console.log(`* Connected to ${addr}:${port}`);
			t.initFlags[0] = true;
		});

		t.client.on('message', (a, b, c, d) => t.MessageHandler(a, b, c, d));

		t.client.on('pong', async (l) => {
			console.log(`Twitch Latency : ${l}`);
			await Bot.Redis.SSet('Latency', String(l));
		});

		t.client.on('automod', (channel, userstate, message) => {
			console.log({ channel, userstate, message });
			const _chl = t.TwitchChannelSpecific({
				Name: channel.replace('#', ''),
			});
			if (_chl) {
				_chl.AutomodMessage(message, userstate);
			}
		});

		return t;
	}

	private async _setupRedisCallbacks() {
		Bot.Redis.Subscribe('EventSub');
		Bot.Redis.on('channel.moderator.add', (Data) => {
			new EventSubTriggers.AddMod(Data).Handle();
		});

		Bot.Redis.on('channel.moderator.remove', (Data) => {
			new EventSubTriggers.RemoveMod(Data).Handle();
		});

		Bot.Redis.on('connect', (Data) => {
			new EventSubTriggers.Connect(Data).Handle();
		});

		Bot.Redis.on('channel.follow', (Data) => {
			new EventSubTriggers.Follow(Data).Handle();
		});
	}

	private async InitFulfill() {
		while (this.initFlags.every((v) => v !== true)) {
			await tools.Sleep(5);
		}
		this.InitReady.resolve(true);
	}

	async AddChannelList(channel: string, user_id: string): Promise<Channel> {
		const c = await Channel.WithEventsub(channel, user_id, 'Write', false);
		this.channels.push(c);
		return this.TwitchChannelSpecific({ ID: user_id })!;
	}

	RemoveChannelList(channel: string): void {
		this.channels.filter((cnl) => {
			return cnl.Name !== channel;
		});
	}

	get TwitchChannels() {
		return this.channels;
	}

	get InitPromise() {
		return this.InitReady.promise;
	}

	async GetChannel(ID: string): Promise<Database.channels | null> {
		const channel = await Bot.SQL.Query<Database.channels[]>`
            SELECT * FROM channels
             WHERE user_id = ${ID}`;

		if (!channel.length) {
			return null;
		}
		return channel[0];
	}

	TwitchChannelSpecific({ ID, Name }: { ID?: string; Name?: string }) {
		if (ID !== undefined) {
			return this.channels.find((chl) => chl.Id === ID);
		} else if (Name !== undefined) {
			return this.channels.find((chl) => chl.Name === Name);
		} else {
			throw new Error('No ID or Name provided');
		}
	}

	// Whisper a user, if the bot is allowed to (Verified)
	// If not verified we find a channel where the user exists.
	// Favor the user's own channel.
	async Whisper(User: IWhisperUser, Message: string): Promise<void> {
		const a = () => `@${User.Username}, New message! 📬 👉 ${Message}`;
		if (!Bot.Config.Verified) {
			console.error('Tried to whisper without being verified', { User, Message });
			return;
		}

		this.client
			.whisper(User.Username, a())
			// Not allowed to whisper, rate limited.
			.catch((err) => {
				// Not important error from twitch.
				if (!Array.isArray(err)) {
					console.error(
						`[Whisper - ${User.Username}] ${new Error(err)}. Message: ${Message}`,
					);
				} else {
					console.error(`[Whisper] ${err}`);
				}
			});
	}

	private async SetOwner(): Promise<void> {
		try {
			const owner = await Bot.Redis.SGet('Owner');
			const self = await Bot.Redis.SGet('SelfID');

			if (owner !== '') {
				this.owner = owner;
				this.initFlags[1] = true;
			}

			if (self !== '') {
				Bot.ID = self;
			}

			if (owner !== '' && self !== '') {
				return;
			}

			const url = `https://api.twitch.tv/helix/users?id=${Bot.Config.OwnerUserID}&login=${Bot.Config.BotUsername}`;

			const res = await got(url, {
				method: 'GET',
				headers: {
					accepts: 'application/json',
					Authorization: `Bearer ${(await tools.token.Bot()).token}`,
					'Client-ID': Bot.Config.Twitch.ClientID,
				},
			});

			const body: IUserInformation = JSON.parse(res.body);

			for (const user of body.data) {
				if (user.id === Bot.Config.OwnerUserID) {
					await Bot.Redis.SSet('Owner', user.login);
					this.owner = user.login;
				}
				if (user.login === Bot.Config.BotUsername) {
					await Bot.Redis.SSet('SelfID', user.id);
					Bot.ID = user.id;
				}
			}

			this.initFlags[1] = true;
		} catch (e) {
			Bot.HandleErrors('Twitch/SetOwner', new Error(e as string));
		}
	}

	private async MessageHandler(
		internal_channel: string,
		user: ChatUserstate,
		message: string,
		self: boolean,
	) {
		internal_channel = internal_channel.slice(1);

		const channel = this.channels.find((chl) => chl.LowercaseName === internal_channel);

		// This would never happen, but typescript rules..
		if (!channel) return;

		try {
			// Update bot's mode if they have changed.
			if (self || user['username'] === Bot.Config.BotUsername) {
				channel.UpdateAll(user);
				return;
			}

			const [command, ...input] = message
				.replace(Bot.Config.Prefix, '')
				.split(/\s+/)
				.filter(Boolean);

			channel.tryTrivia(user, [command, ...input]);

			if (!message.toLocaleLowerCase().startsWith(Bot.Config.Prefix)) {
				return;
			}

			channel.tryCommand(user, command, input);
		} catch (error) {
			Bot.HandleErrors('Twitch/MessageHandler', new Error(error as never));
			channel.say('BrokeBack command failed', {
				SkipBanphrase: true,
				NoEmoteAtStart: true,
			});
		}
	}
}
