import * as tools from './../../tools/tools.js';
import process from 'node:process';
import { ECommandFlags, EPermissionLevel } from './../../Typings/enums.js';
import { registerCommand } from '../../controller/Commands/Handler.js';

registerCommand({
	Name: 'ping',
	Description: 'Pings the user with some small info.',
	Permission: EPermissionLevel.VIEWER,
	OnlyOffline: false,
	Aliases: [],
	Cooldown: 20,
	Params: [],
	Flags: [ECommandFlags.ResponseIsReply],
	PreHandlers: [],
	Code: async function (ctx) {
		const Result = [
			'Pong',
			`Uptime ${tools.SecondsFmt(process.uptime())}`,
			'Delay to TMI ' + (await Bot.Redis.SGet('Latency')) + ' ms',
		]
			.filter(Boolean)
			.join(' | ');

		return {
			Success: true,
			Result,
		};
	},
});
