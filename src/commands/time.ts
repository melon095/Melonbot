import { EPermissionLevel } from '../Typings/enums.js';
import { TCommandContext, ParseArguments } from '../Models/Command.js';
import { Fetch } from './../PreHandlers/index.js';
import { GetCommandBy, registerCommand } from '../controller/Commands/Handler.js';

registerCommand({
	Name: 'time',
	Ping: false,
	Description: 'Time a command, similar to the time command in unix',
	Permission: EPermissionLevel.ADMIN,
	OnlyOffline: false,
	Aliases: [],
	Cooldown: 5,
	Params: [],
	Flags: [],
	PreHandlers: [],
	Code: async function (ctx) {
		const name = ctx.input[0];
		if (!name) {
			return {
				Result: 'Give a command..',
				Success: false,
			};
		}

		const command = await GetCommandBy(name);
		if (!command) {
			return {
				Result: 'Command not found',
				Success: false,
			};
		}

		let params;
		try {
			params = ParseArguments(ctx.input.slice(1), command.Params);
		} catch (error) {
			return {
				Result: (error as Error).message,
				Success: false,
			};
		}

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
		const response = await command.Code(context, mods).catch((err) => {
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
	},
});
