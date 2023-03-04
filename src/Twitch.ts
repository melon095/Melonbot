import DankTwitch from '@kararty/dank-twitch-irc';
import * as tools from './tools/tools.js';
import { Channel } from './controller/Channel/index.js';
import got from './tools/Got.js';
import { Promolve, IPromolve } from '@melon95/promolve';
import User from './controller/User/index.js';
import ChannelTable from './controller/DB/Tables/ChannelTable.js';

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

export default class Twitch {
	public client: DankTwitch.ChatClient;
	public owner!: string;

	public channels: Channel[] = [];

	private initFlags: [boolean, boolean] = [false, false];
	private InitReady: IPromolve<boolean> = Promolve<boolean>();

	private constructor() {
		this.InitFulfill();

		this.client = new DankTwitch.ChatClient({
			username: Bot.Config.BotUsername,
			password: Bot.Config.Twitch.OAuth,
			rateLimits: Bot.Config.Verified ? 'verifiedBot' : 'default',
			connection: {
				type: 'websocket',
				secure: true,
			},
		});
		this.client.on('ready', () => {
			Bot.Log.Info('Twitch client ready');
			this.initFlags[0] = true;
		});

		this.client.on('PRIVMSG', (msg) => this.MessageHandler(msg));

		this.client.on('error', (error) => {
			Bot.Log.Error(error, 'TMI Error');

			if (
				error instanceof DankTwitch.SayError &&
				error.cause instanceof DankTwitch.MessageError
			) {
				if (
					error.message.includes('Bad response message') &&
					error.message.includes('@msg-id=msg_rejected_mandatory')
				) {
					this.TwitchChannelSpecific({
						Name: error.failedChannelName,
					})?.AutomodMessage(
						'A message that was about to be posted was blocked by automod',
					);
				}
			}
		});

		this.client.on('PING', async () => {
			const before = Date.now();
			await this.client.ping();
			await Bot.Redis.SSet('Latency', String(Date.now() - before));
		});

		this.client.connect();
	}

	static async Init() {
		const t = new Twitch();

		await t.SetOwner();

		return t;
	}

	private async InitFulfill() {
		while (this.initFlags.every((v) => v !== true)) {
			await tools.Sleep(5);
		}
		this.InitReady.resolve(true);
	}

	async AddChannelList(user: User, eventsub = false): Promise<Channel> {
		const c = await Channel.New(user, 'Write', false);
		if (eventsub) {
			await c.joinEventSub();
		}
		this.channels.push(c);
		return c;
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

	async GetChannel(ID: string): Promise<ChannelTable | null> {
		const channel = await Bot.SQL.selectFrom('channels')
			.selectAll()
			.where('user_id', '=', ID)
			.executeTakeFirst();

		if (!channel) {
			return null;
		}

		return channel;
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

	async TryRejoin(channel: Channel, name: string): Promise<void> {
		await this.client.join(name);
		await channel.joinEventSub();
		await channel.setPermissionMode('Write');
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

			const body: IUserInformation = await got('json')(url, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${(await tools.token.Bot()).token}`,
					'Client-ID': Bot.Config.Twitch.ClientID,
				},
			}).json();

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
			Bot.Log.Error(e as Error, 'Twitch/SetOwner');
		}
	}

	private async MessageHandler(msg: DankTwitch.PrivmsgMessage) {
		const { channelName, messageText, senderUserID, senderUsername } = msg;

		const channel = this.channels.find((chl) => chl.LowercaseName === channelName);

		// This would never happen, but typescript rules..
		if (!channel) return;

		try {
			const user = await Bot.User.Get(senderUserID, senderUsername);

			// Update bot's mode if they have changed.
			if (senderUsername === Bot.Config.BotUsername) {
				channel.UpdateAll(msg);
				return;
			}

			const [commandName, ...input] = messageText
				.replace(Bot.Config.Prefix, '')
				.split(/\s+/)
				.filter(Boolean);

			channel.tryTrivia(senderUsername, [commandName, ...input]);

			if (!messageText.toLocaleLowerCase().startsWith(Bot.Config.Prefix)) {
				return;
			}
			/*
                Checks if mode is read, allows the owner to use commands there.
                Or if the command is in the filter.
            */
			if (
				(channel.Mode === 'Read' && user.TwitchUID !== Bot.Config.OwnerUserID) ||
				channel.Filter.includes(input[1])
			) {
				return;
			}

			const result = await channel.tryCommand(user, input, commandName, msg);

			if (!result || !result.message) {
				return;
			}

			channel.say(result.message, result.flags);
		} catch (error) {
			Bot.Log.Error(error as Error, 'Twitch/MessageHandler');
		}
	}
}
