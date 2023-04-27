import { EPermissionLevel } from '../../Typings/enums.js';
import { TCommandContext, ParseArguments } from '../../Models/Command.js';
import { Fetch } from './../../PreHandlers/index.js';
import { GetCommandBy, registerCommand } from '../../controller/Commands/Handler.js';

registerCommand({
	Name: 'time',
	Description: 'Time a command, similar to the time command in unix',
	Permission: EPermissionLevel.ADMIN,
	Aliases: [],
	Cooldown: 5,
	Params: [],
	Flags: [],
	PreHandlers: [],
	Code: async function (ctx) {
		const name = ctx.input[0];
		if (!name) {
			this.EarlyEnd.InvalidInput('No command specified');
		}

		const command = GetCommandBy(name);
		if (!command) {
			this.EarlyEnd.InvalidInput('Command not found');
		}

		const params = ParseArguments(ctx.input.slice(1), command.Params);

		const context: TCommandContext = {
			...ctx,
			input: params.output,
			data: {
				...ctx.data,
				Params: params.values,
			},
		};

		const mods = await Fetch(context, command.PreHandlers);

		const start = performance.now();
		const response = await command.Code(context, mods);

		const end = performance.now();

		const time = (end - start).toFixed(2);
		const resp = `${time}ms - ${response.Result}`;

		return {
			Result: resp,
			Success: true,
		};
	},
});
