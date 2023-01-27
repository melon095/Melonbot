import Got from './../tools/Got.js';
import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { EPermissionLevel } from './../Typings/enums.js';

export default class extends CommandModel {
	Name = 'rust';
	Ping = true;
	Description = 'Experimental command for rust server';
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

		const result = await Got('json').post(`http://localhost:${port}/`, {
			json: {
				command: args,
				channel: [ctx.channel.Id, ctx.channel.Name],
				user: [ctx.user.TwitchUID, ctx.user.Name],
			},
			throwHttpErrors: false,
		});

		if (result.statusCode !== 200) {
			ctx.Log('error', `Rust server returned ${result.statusCode} status code.`);

			return {
				Success: false,
				Result: 'Rust server returned error.',
			};
		}

		return {
			Success: true,
			Result: result.body,
		};
	};
	LongDescription = async (prefix: string) => [
		'Experimental command for executing test commands in rust server.',
		'',
		'Enabled in select channels only.',
	];
}
