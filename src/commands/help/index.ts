import { ECommandFlags, EPermissionLevel } from './../../Typings/enums.js';
import { GetCommandBy, registerCommand } from '../../controller/Commands/Handler.js';
import { CommandPermissionToString } from '../../controller/DB/Tables/CommandTable.js';

registerCommand({
	Name: 'help',
	Description: 'Prints out the description of a command or the website if nothing was specified',
	Permission: EPermissionLevel.VIEWER,
	OnlyOffline: false,
	Aliases: ['commands'],
	Cooldown: 5,
	Params: [],
	Flags: [ECommandFlags.ResponseIsReply],
	PreHandlers: [],
	Code: async function (ctx) {
		const website = Bot.Config.Services.Website.WebUrl;

		if (ctx.input.length <= 0) {
			return {
				Success: true,
				Result: `You can find all the commands here, ${website}/bot/commands-list`,
			};
		}

		const name = ctx.input[0];

		const command = GetCommandBy(name);

		if (command === undefined) {
			return {
				Success: true,
				Result: `The command ${name} doesn't exist :(`,
			};
		}

		const { Name, Description, Cooldown, Permission } = command;
		const permissionLevel = CommandPermissionToString(Permission);

		return {
			Success: true,
			Result: `${Name}: Description: ${Description} Cooldown: ${Cooldown}s. Permission: ${permissionLevel} ${website}/bot/commands-list/${Name}`,
		};
	},
});
