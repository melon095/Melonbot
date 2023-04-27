import { registerCommand } from '../../controller/Commands/Handler.js';
import { ECommandFlags, EPermissionLevel } from './../../Typings/enums.js';

registerCommand({
	Name: 'github',
	Description: 'Shows the git repo',
	Permission: EPermissionLevel.VIEWER,
	Aliases: ['git'],
	Cooldown: 10,
	Params: [],
	Flags: [ECommandFlags.ResponseIsReply],
	PreHandlers: [],
	Code: async function () {
		return {
			Success: true,
			Result: 'https://github.com/JoachimFlottorp/Melonbot',
		};
	},
});
