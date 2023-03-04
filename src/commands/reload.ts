import { EPermissionLevel } from './../Typings/enums.js';
import SevenTV from './../SevenTVGQL.js';
import fs from 'node:fs';
import path from 'node:path';
import { registerCommand } from '../controller/Commands/Handler.js';

registerCommand({
	Name: 'reload',
	Ping: false,
	Description: 'Reload Internal state',
	Permission: EPermissionLevel.ADMIN,
	OnlyOffline: false,
	Aliases: [],
	Cooldown: 5,
	Params: [],
	Flags: [],
	PreHandlers: [],
	Code: async function (ctx) {
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
				SevenTV.setup(Bot.Config.SevenTV.Bearer);
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
	},
});
