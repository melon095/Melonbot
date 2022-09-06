import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';
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
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		if (ctx.channel.Name !== Bot.Config.BotUsername) {
			return {
				Success: false,
				Result: 'This command works only in my channel :)',
			};
		}

		const [name] = await Bot.SQL.Query<Database.channels[]>`
                SELECT name 
                FROM channels 
                WHERE user_id = ${ctx.user.TwitchUID}`;

		if (name) {
			return {
				Success: false,
				Result: 'I am already in your channel.',
			};
		}

		return await Channel.Join(ctx.user)
			.then(() => {
				return {
					Success: true,
					Result: `Joining your channel. :) Remember to read 👉 https://twitch.tv/${Bot.Config.BotUsername}/about for info on setting me up.`,
				};
			})
			.catch(() => {
				return {
					Success: false,
					Result: 'Something went wrong :(',
				};
			});
	};
}
