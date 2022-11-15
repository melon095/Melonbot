import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { EPermissionLevel } from './../Typings/enums.js';

import SevenTV from './../SevenTVGQL.js';
import fs from 'node:fs';
import path from 'node:path';

export default class extends CommandModel {
	Name = 'reload';
	Ping = false;
	Description = 'Reload Internal state';
	Permission = EPermissionLevel.ADMIN;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [];
	Flags = [];
	PreHandlers = [];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		const setting = ctx.input[0];
		if (!setting) {
			return {
				Success: false,
				Result: 'No setting provided',
			};
		}

		switch (setting) {
			case 'config': {
				const env = await import('./../CreateEnv.js');
				const config = JSON.parse(
					fs.readFileSync(path.join(process.cwd() + '/config.json'), 'utf-8'),
				);
				env.addConfig(config);
				SevenTV.setup();
				break;
			}
			default: {
				return {
					Success: false,
					Result: 'Invalid setting',
				};
			}
		}

		return {
			Success: true,
			Result: 'Done :D',
		};
	};
}
