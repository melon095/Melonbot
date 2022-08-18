import { CloseErrorHandler } from './ErrorHandler.js';
import { Setup } from './CreateEnv.js';

//do something when app is closing
process.on('exit', exitHandler.bind(null));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null));
process.on('SIGUSR2', exitHandler.bind(null));

process.on('unhandledRejection', async (err, promise) => {
	console.error(`Unhandled rejection (promise: ${promise}, reason: ${err})`);
});

Setup.All().then((cfg) => Setup.Bot(cfg));

async function exitHandler(): Promise<void> {
	// Close error file
	CloseErrorHandler();
	// Wait for all messages to get sent before turning off bot.
	await Promise.all(
		Bot.Twitch.Controller.TwitchChannels.map(async (channel) => {
			await channel.Queue.closeAll();
		}),
	);

	await Bot.Twitch.Emotes.SevenTVEvent.Close();

	return Promise.resolve();
}
