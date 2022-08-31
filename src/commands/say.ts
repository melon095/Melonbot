import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';

export default class extends CommandModel {
	Name = 'say';
	Ping = false;
	Description = 'Says the direct input.';
	Permission = EPermissionLevel.ADMIN;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [];
	Flags = [ECommandFlags.NO_EMOTE_PREPEND];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		return { Success: true, Result: `${ctx.input.join(' ')}` };
	};
}
