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

	await (await import('../CreateEnv.js')).Setup.All();
	await import('../web/index.js');
})();
