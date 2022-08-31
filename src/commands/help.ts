import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';
import { NCommandFunctions } from './../tools/tools.js';

export default class extends CommandModel {
	Name = 'help';
	Ping = true;
	Description = 'Prints out the description of a command or the website if nothing was specified';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = ['commands'];
	Cooldown = 5;
	Params = [];
	Flags = [ECommandFlags.NO_BANPHRASE];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		const website = Bot.Config.Website.WebUrl;

		if (ctx.input.length <= 0) {
			return {
				Success: true,
				Result: `You can find all the commands here, ${website}/bot/commands !`,
			};
		}

		const name = ctx.input[0];

		const command = await Bot.Commands.get(name);

		if (command === undefined) {
			return {
				Success: true,
				Result: `The command ${name} doesn't exist :(`,
			};
		}

		const { Name, Description, Cooldown, Permission } = command;

		return {
			Success: true,
			Result: `${Name}: Description: ${Description} Cooldown: ${Cooldown}s. Permission: ${NCommandFunctions.DatabaseToMode(
				Permission,
			)} ${website}/bot/commands/${Name}`,
		};
	};
}
