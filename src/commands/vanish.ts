import { TCommandContext } from './../Typings/types';
import { EPermissionLevel } from './../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';

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
	Code = async (ctx: TCommandContext) => {
		if (ctx.channel.Mode !== 'Moderator') return this.Resolve();
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		Bot.Twitch.Controller.client.timeout(
			ctx.channel.Name,
			ctx.user.username!,
			1,
			'Vanish command issued',
		);
		this.Resolve();
	};
}
