import * as Lua from './../experimental/lua.js';
import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { EPermissionLevel } from './../Typings/enums.js';

export default class extends CommandModel {
	Name = 'lua';
	Ping = true;
	Description = 'Experimental command for lua';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [];
	Flags = [];
	PreHandlers = [];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		const isAllowed = (await ctx.channel.GetSettings()).IsTester.ToBoolean() === true;

		if (!isAllowed) {
			return {
				Success: false,
				Result: 'This command is not allowed in this channel.',
			};
		}

		const port = process.env.EXPERIMENTAL_SERVER_PORT;
		if (!port) {
			return {
				Success: false,
				Result: 'Rust server address is not set.',
			};
		}

		const args = ctx.input.join(' ');

		const response = await Lua.request({
			type: Lua.RequestType.Command,
			reply_id: ctx.data.User.messageID,
			command: args,
			channel: [ctx.channel.Id, ctx.channel.Name],
			invoker: [ctx.user.TwitchUID, ctx.user.Name],
		});

		if (response.err) {
			ctx.Log('error', response.inner);

			return {
				Success: false,
				Result: 'Rust server returned error.',
			};
		}

		return {
			Success: true,
			Result: response.inner[1],
		};
	};
	LongDescription = async (prefix: string) => [
		'Experimental command for executing test commands in rust server.',
		'',
		'Enabled in select channels only.',
	];
}
