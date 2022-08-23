import { Database, TCommandContext } from './../Typings/types';
import { EPermissionLevel } from './../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';
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
	Code = async (ctx: TCommandContext) => {
		const setting = ctx.input[0];
		if (!setting) {
			this.Resolve('No setting provided');
			return;
		}

		switch (setting) {
			case 'config': {
				const env = await import('./../CreateEnv.js');
				const config = JSON.parse(
					fs.readFileSync(path.join(process.cwd() + '/config.json'), 'utf-8'),
				);
				env.addConfig(config);
				break;
			}
			default: {
				this.Resolve('Invalid setting provided');
				return;
			}
		}
		SevenTV.setup();

		this.Resolve('Done :)');
		return;
	};
}
