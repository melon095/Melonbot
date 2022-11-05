import { EPermissionLevel } from '../Typings/enums.js';
import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { CommandsHandler } from './../controller/Commands/Handler.js';

export default class extends CommandModel {
	Name = 'time';
	Ping = false;
	Description = 'Time a command, similar to the time command in unix';
	Permission = EPermissionLevel.ADMIN;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [];
	Flags = [];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		const name = ctx.input[0];
		if (!name) {
			return {
				Result: 'Give a command..',
				Success: false,
			};
		}

		const command = await Bot.Commands.get(name);
		if (!command) {
			return {
				Result: 'Command not found',
				Success: false,
			};
		}

		const start = performance.now();
		const response = await command.Code(ctx).catch((err) => {
			return {
				Result: err,
				Success: false,
			};
		});

		const end = performance.now();

		const time = (end - start).toFixed(2);
		const resp = `${time}ms - ${response.Result}`;

		return {
			Result: resp,
			Success: true,
		};
	};
}
