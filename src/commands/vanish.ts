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
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		await ctx.channel.VanishUser(ctx.user.senderUsername);

		return {
			Success: true,
			Result: '',
		};
	};
}
