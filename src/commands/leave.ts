import { TCommandContext } from './../Typings/types';
import { EPermissionLevel } from './../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';

export default class extends CommandModel {
	Name = 'leave';
	Ping = true;
	Description =
		'Leave your channel, works in your channel and the bots channel. All statistics about your channel will be removed.';
	Permission = EPermissionLevel.BROADCAST;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [];
	Flags = [];
	Code = async (ctx: TCommandContext) => {
		await Bot.SQL.Query`DELETE FROM channels WHERE user_id = ${ctx.channel.Id}`;
		Bot.Twitch.Controller.RemoveChannelList(ctx.channel.Name);

		setTimeout(() => {
			Bot.Twitch.Controller.client.part('#' + ctx.channel.Name);
		}, 10000); // Leave after 10 seconds.

		this.Resolve(':( ok');
	};
}
