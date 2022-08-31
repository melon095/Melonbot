import shell from 'node:child_process';
import * as tools from './../tools/tools.js';
import process from 'node:process';
import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';

const cleanCommand = (command: string) =>
	shell
		.execSync(command)
		.toString()
		.replace(/\r?\n|\r/g, '');

export default class extends CommandModel {
	Name = 'ping';
	Ping = true;
	Description = 'Pings the user with some small info.';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 20;
	Params = [];
	Flags = [ECommandFlags.NO_EMOTE_PREPEND];
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		const commitCount = cleanCommand('git rev-list --all --count');
		const commitSha = cleanCommand('git rev-parse --short HEAD');
		const branch = cleanCommand('git rev-parse --abbrev-ref HEAD');

		const latency = (await Bot.Redis.SGet('Latency')) || 'N/A';
		const devBot = Bot.Config.Development ? ' Development Bot' : ' ';

		return {
			Success: true,
			Result: [
				`Pong!`,
				`Uptime ${tools.humanizeDuration(process.uptime())}`,
				`${commitCount} ${branch.toString()}@${commitSha}`,
				`Delay ${latency}S`,
				devBot,
			]
				.filter(Boolean)
				.join(' | '),
		};
	};
}
