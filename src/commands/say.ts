import { TCommandContext } from './../Typings/types';
import { EPermissionLevel, ECommandFlags } from './../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';

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
	Code = async (ctx: TCommandContext) => {
		this.Resolve(ctx.input.join(' '));
	};
}
