/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Database, TCommandContext } from './../Typings/types';
import { EPermissionLevel, ECommandFlags } from './../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';
import { Channel } from './../controller/Channel/index.js';

export default class extends CommandModel {
	Name = 'join';
	Ping = true;
	Description = 'Join a channel. Works only in bots channel';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 20;
	Params = [];
	Flags = [ECommandFlags.NO_BANPHRASE];
	Code = async (ctx: TCommandContext) => {
		if (ctx.channel.Name !== Bot.Config.BotUsername) {
			return this.Resolve('This command works only in my channel :)');
		}

		const [name] = await Bot.SQL.Query<Database.channels[]>`
                SELECT name 
                FROM channels 
                WHERE user_id = ${ctx.user['user-id']!}`;

		if (name) {
			return this.Resolve('I am already in your channel.');
		}

		await Channel.Join(ctx.user.username!, ctx.user['user-id']!)
			.then(() => {
				this.Resolve(`joining your channel! :)`);
			})
			.catch(() => {
				this.Resolve('Failed to join your channel. :(');
			});
	};
}
