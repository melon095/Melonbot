import { TCommandContext, Database } from './../Typings/types';
import { EPermissionLevel, ECommandFlags } from './../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';
import { NCommandFunctions } from './../tools/tools.js';

export default class extends CommandModel {
	Name = 'help';
	Ping = true;
	Description =
		'Prints out the description of a command or the website if nothing was specified';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = ['commands'];
	Cooldown = 5;
	Params = [];
	Flags = [ECommandFlags.NO_BANPHRASE];
	Code = async (ctx: TCommandContext) => {
		if (ctx.input.length <= 0)
			return this.Resolve(
				`You can find all the commands here, ${Bot.Config.Website.WebUrl}/bot/commands !`,
			);

        const name = ctx.input[0];
            
		const command = await Bot.Commands.get(name);

		if (command === undefined) {
			return this.Resolve('Command does not exist PoroSad');
		}

		const { Name, Description, Cooldown, Permission, Aliases } = command;

		return this.Resolve(
			`${Name}: Description: ${Description}. Cooldown: ${Cooldown}s. Permission: ${NCommandFunctions.DatabaseToMode(
				Permission,
			)}. Aliases: ${Aliases.join(' | ')}`,
		);
	};
}
