import * as tools from './../tools/tools.js';
import process from 'node:process';
import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { EPermissionLevel } from './../Typings/enums.js';

export default class extends CommandModel {
	Name = 'ping';
	Ping = true;
	Description = 'Pings the user with some small info.';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 20;
	Params = [];
	Flags = [];
	PreHandlers = [];
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		const devBot = Bot.Config.Development ? ' Development Bot' : ' ';

		return {
			Success: true,
			Result: [`Pong!`, `Uptime ${tools.humanizeDuration(process.uptime())}`, devBot]
				.filter(Boolean)
				.join(' | '),
		};
	};
}
