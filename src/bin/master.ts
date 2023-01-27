import * as tools from './../tools/tools.js';
import Twitch from './../Twitch.js';
import { SevenTVEvent } from './../controller/Emote/SevenTV/EventAPI.js';
import TimerSingleton from './../Singletons/Timers/index.js';
import { Channel, GetSettings } from './../controller/Channel/index.js';
import channels from 'Typings/models/bot/channels.js';
import { ChatClient } from '@kararty/dank-twitch-irc';

(async () => {
	/* eslint-disable @typescript-eslint/ban-ts-comment */
	/*Ignore error not containing required data*/
	// @ts-ignore
	global.Bot = {};
	// @ts-ignore
	Bot.Config = {};
	// @ts-ignore
	Bot.Config.Twitch = {};
	// @ts-ignore
	Bot.Config.SQL = {};

	const { Setup } = await import('../CreateEnv.js');

	//do something when app is closing
	process.on('exit', exitHandler.bind(null));

	//catches ctrl+c event
	process.on('SIGINT', exitHandler.bind(null));

	// catches "kill pid" (for example: nodemon restart)
	process.on('SIGUSR1', exitHandler.bind(null));
	process.on('SIGUSR2', exitHandler.bind(null));

	process.on('unhandledRejection', async (err, promise) => {
		console.error('Unhandled rejection', { err, promise });
	});

	await Setup.All('BOT');

	await Promise.all([initialize(), import('./../loops/loops.js')]);
})();

async function initialize() {
	if (!(await tools.token.Bot()).token) {
		Bot.Log.Error('Missing Twitch Config');
		process.exit(-1);
	}
	// Create Twitch objects
	Bot.Twitch = {
		Controller: await Twitch.Init(),
		Emotes: {
			SevenTVEvent: new SevenTVEvent(),
		},
	};

	await TimerSingleton.I().Initialize();

	await Bot.Twitch.Controller.InitPromise;
	const twitch = Bot.Twitch.Controller;

	Bot.Twitch.Emotes.SevenTVEvent.Connect();

	const self = await Channel.CreateBot();

	await twitch.client.join(Bot.Config.BotUsername);
	twitch.channels.push(self);

	// Join all channels
	const channelList = await Bot.SQL.Query<Database.channels[]>`
                SELECT * FROM channels 
                WHERE name NOT LIKE ${Bot.Config.BotUsername}`;

	if (!channelList.length) {
		return;
	}

	for (const channel of channelList) {
		const newChannel = await DoCreateChannel(twitch.client, channel);
		twitch.channels.push(newChannel);
	}
}

async function DoCreateChannel(client: ChatClient, channel: channels): Promise<Channel> {
	let mode = tools.NChannelFunctions.DatabaseToMode(channel.bot_permission);
	const user = await Bot.User.Get(channel.user_id, channel.name);
	let doEventsub = true;

	Bot.Log.Info(`Twitch Joining %s`, channel.name);
	try {
		await client.join(channel.name);
	} catch (error) {
		Bot.Log.Error(error as Error, `Joining ${channel.name}`);
		mode = 'Read'; // We want to create a channel object, but since we can't join, we set the mode to read
		doEventsub = false;
	}
	const newChannel = await Channel.New(user, mode, channel.live);

	if (doEventsub) {
		const emote_set = await GetSettings(user).then(
			(settings) => settings.SevenTVEmoteSet.ToString() ?? undefined,
		);

		await Channel.WithEventsub(newChannel, emote_set);
	}

	await tools.Sleep(Bot.Config.Verified ? 0.025 : 1);

	return newChannel;
}

async function exitHandler(): Promise<void> {
	// Wait for all messages to get sent before turning off bot.
	const promises = [Bot.Twitch.Emotes.SevenTVEvent.Close()];
	for (const channel of Bot.Twitch.Controller.TwitchChannels) {
		promises.push(channel.Queue.closeAll());
	}

	await Promise.all(promises);
}
