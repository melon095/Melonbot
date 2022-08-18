import shell from 'node:child_process';
import * as tools from './../tools/tools.js';
import process from 'node:process';
import { TCommandContext } from './../Typings/types';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';
import { freemem, totalmem } from 'node:os';

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
	Code = async (ctx: TCommandContext) => {
		const commitCount = shell
			.execSync('git rev-list --all --count')
			.toString()
			.replace(/\r?\n|\r/g, '');
		const commitSha = shell
			.execSync('git rev-parse --short HEAD')
			.toString()
			.replace(/\r?\n|\r/g, '');
		const branch = shell
			.execSync('git rev-parse --abbrev-ref HEAD')
			.toString()
			.replace(/\r?\n|\r/g, '');

		const latency = await Bot.Redis.SGet('Latency');
		const devBot = Bot.Config.Development ? ' Development Bot' : ' ';

		this.Resolve(
			[
				`pong`,
				`Uptime ${tools.humanizeDuration(process.uptime())}`,
				`${commitCount} ${branch.toString()}@${commitSha}`,
				`Delay ${latency}S`,
				devBot,
			]
				.filter(Boolean)
				.join(' | '),
		);
	};
}
