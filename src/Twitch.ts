import DankTwitch, {
	joinChannel,
	partChannel,
	PongMessage,
	reply,
	say,
	sendPing,
} from '@kararty/dank-twitch-irc';
import * as tools from './tools/tools.js';
import { Channel, ExecuteCommand } from './controller/Channel/index.js';
import { Promolve, IPromolve } from '@melon95/promolve';
import User from './controller/User/index.js';

function NoticeMessageIsReject(message: string) {
	return (
		message.includes('Bad response message') &&
		message.includes('@msg-id=msg_rejected_mandatory')
	);
}

function createConnection() {
	const port = Bot.Config.Services.Firehose.Port;

	return new DankTwitch.SingleConnection({
		username: Bot.Config.BotUsername,
		password: '',
		rateLimits: Bot.Config.Verified ? 'verifiedBot' : 'default',
		connection: {
			type: 'tcp',
			secure: false,
			host: FIREHOSE_HOST,
			port,
			// Stop sending CAP, PASS
			preSetup: true,
		},
	});
}

export const FIREHOSE_HOST = process.env.MELONBOT_FIREHOSE || '127.0.0.1';

export default class Twitch {
	public client: DankTwitch.SingleConnection;

	public channels: Channel[] = [];

	private initFlags: [boolean, boolean] = [false, false];
	private InitReady: IPromolve<boolean> = Promolve<boolean>();

	private constructor() {
		this.InitFulfill();

		this.client = createConnection();

		this.setupCallbacks();

		this.client.connect();
	}

	/*
        Re-implement ping, say etc functions

        // FIXME: Add validation?
    */

	ping(): Promise<PongMessage> {
		return sendPing(this.client);
	}

	async say(channel: string, message: string): Promise<void> {
		await say(this.client, channel, message);
	}

	async reply(channel: string, id: string, message: string): Promise<void> {
		await reply(this.client, channel, id, message);
	}

	async join(channel: string): Promise<void> {
		await joinChannel(this.client, channel);
	}

	async part(channel: string): Promise<void> {
		await partChannel(this.client, channel);
	}

	static async Init() {
		const t = new Twitch();

		await t.SetOwner();

		return t;
	}

	private setupCallbacks() {
		this.client.on('ready', () => {
			Bot.Log.Info('Twitch client ready');
			this.initFlags[0] = true;
		});

		this.client.on('PRIVMSG', (msg) => this.MessageHandler(msg));

		this.client.on('error', (error) => {
			if (error instanceof DankTwitch.ConnectionError) {
				// Ignore, as this is caused by the firehose server going down

				return;
			}

			if (
				error instanceof DankTwitch.JoinError &&
				error.message.includes('Error occured in transport layer')
			) {
				return; // Firehose server is not yet up, dt-irc tried to connect
			}

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
			await sendPing(this.client);
			await Bot.Redis.SSet('Latency', String(Date.now() - before));
		});

		this.client.on('close', (error) => {
			if (error) {
				Bot.Log.Error(error, 'TMI Connection Closed, reconnecting...');
			}

			this.client.close();

			this.client = createConnection();

			this.setupCallbacks();

			this.client.connect();
		});
	}

	private async InitFulfill() {
		while (this.initFlags.every((v) => v !== true)) {
			await tools.Sleep(5);
		}
		this.InitReady.resolve(true);
	}

	async AddChannelList(user: User): Promise<Channel> {
		const c = await Channel.New(user, 'Write');
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

	TwitchChannelSpecific({ ID, Name }: { ID?: string; Name?: string }) {
		if (ID !== undefined) {
			return this.channels.find((chl) => chl.Id === ID);
		} else if (Name !== undefined) {
			return this.channels.find((chl) => chl.Name === Name);
		} else {
			throw new Error('No ID or Name provided');
		}
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

		if (!channel) return;

		try {
			const user = await Bot.User.Get(senderUserID, senderUsername);

			const [commandName, ...input] = messageText
				.replace(Bot.Config.Prefix, '')
				.split(/\s+/)
				.filter(Boolean);

			channel.tryTrivia(senderUsername, [commandName, ...input]);

			if (!messageText.toLocaleLowerCase().startsWith(Bot.Config.Prefix)) {
				return;
			}

			if (channel.Mode === 'Read' && user.TwitchUID !== Bot.Config.OwnerUserID) {
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
