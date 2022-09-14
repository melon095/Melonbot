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

	Setup.All('BOT').then(() => Setup.Bot());

	async function exitHandler(): Promise<void> {
		// Wait for all messages to get sent before turning off bot.
		const promises = [Bot.Twitch.Emotes.SevenTVEvent.Close()];
		for (const channel of Bot.Twitch.Controller.TwitchChannels) {
			promises.push(channel.Queue.closeAll());
		}

		await Promise.all(promises);
	}
})();
