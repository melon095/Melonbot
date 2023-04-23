import Helix from './../../Helix/index.js';
import { EPermissionLevel } from './../../Typings/enums.js';
import { registerCommand } from '../../controller/Commands/Handler.js';
import TimerSingleton from '../../Singletons/Timers/index.js';

registerCommand({
	Name: 'leave',
	Description:
		'Leave your channel, works in your channel and the bots channel. All statistics about your channel will be removed.',
	Permission: EPermissionLevel.BROADCAST,
	OnlyOffline: false,
	Aliases: [],
	Cooldown: 5,
	Params: [],
	Flags: [],
	PreHandlers: [],
	Code: async function (ctx) {
		const { channel } = ctx;
		const subs = channel.EventSubs.GetSubscription();

		if (subs) {
			await Promise.all(subs.map((sub) => Helix.EventSub.Delete(sub.ID())));
		}

		const rdsKeys = await Bot.Redis.Keys(`channel:${channel.Id}:*`);
		await Promise.all(rdsKeys.map((key) => Bot.Redis.SDel(key)));

		Bot.Twitch.Controller.RemoveChannelList(ctx.channel.Name);
		setTimeout(() => {
			Bot.Twitch.Controller.client.part(ctx.channel.Name);
		}, 10000); // Leave after 10 seconds.

		await Bot.SQL.deleteFrom('channels').where('user_id', '=', ctx.channel.Id).execute();

		await TimerSingleton.I().DeleteForChannel(ctx.channel.Id);

		return {
			Success: true,
			Result: ':( Ok',
		};
	},
});
