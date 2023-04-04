import DankTwitch from '@kararty/dank-twitch-irc';
import * as tools from './tools/tools.js';
import { Channel, ExecuteCommand } from './controller/Channel/index.js';
import { Promolve, IPromolve } from '@melon95/promolve';
import User from './controller/User/index.js';
import ChannelTable from './controller/DB/Tables/ChannelTable.js';
import assert from 'node:assert';

function NoticeMessageIsReject(message: string) {
	return (
		message.includes('Bad response message') &&
		message.includes('@msg-id=msg_rejected_mandatory')
	);
}

export default class Twitch {
	public client: DankTwitch.ChatClient;

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
				if (NoticeMessageIsReject(error.cause.message)) {
					const message = 'A message that was about to be posted was blocked by automod';

					this.TwitchChannelSpecific({ Name: error.failedChannelName })?.say(message, {
						SkipBanphrase: true,
					});
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

	async AddChannelList(user: User): Promise<Channel> {
		const c = await Channel.New(user, 'Write', false);
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
		await channel.setPermissionMode('Write');
	}

	private async SetOwner(): Promise<void> {
		try {
			const self = await Bot.Redis.SGet('SelfID');

			if (self) Bot.ID = self;
			else {
				const selfUser = await Bot.User.ResolveUsername(Bot.Config.BotUsername);

				await Bot.Redis.SSet('SelfID', selfUser.TwitchUID);
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

			const result = await ExecuteCommand(channel, user, input, commandName, msg);

			if (!result || !result.message) {
				return;
			}

			channel.say(result.message, result.flags);
		} catch (error) {
			Bot.Log.Error(error as Error, 'Twitch/MessageHandler');
		}
	}
}
