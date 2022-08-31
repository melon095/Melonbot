import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { EPermissionLevel } from './../Typings/enums.js';

export default class extends CommandModel {
	Name = 'vanish';
	Ping = true;
	Description =
		'Vanishes the person who requests the command. Requires that the bot has the moderator role.';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [];
	Flags = [];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		if (ctx.channel.Mode !== 'Moderator') {
			return {
				Success: true,
				Result: '',
			};
		}
		await ctx.channel.VanishUser(ctx.user.Name);

		return {
			Success: true,
			Result: '',
		};
	};
}
