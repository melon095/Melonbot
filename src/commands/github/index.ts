import { registerCommand } from '../../controller/Commands/Handler.js';
import { EPermissionLevel } from './../../Typings/enums.js';

registerCommand({
	Name: 'github',
	Ping: false,
	Description: 'Shows the git repo',
	Permission: EPermissionLevel.VIEWER,
	OnlyOffline: false,
	Aliases: ['git'],
	Cooldown: 10,
	Params: [],
	Flags: [],
	PreHandlers: [],
	Code: async function () {
		return {
			Success: true,
			Result: 'https://github.com/JoachimFlottorp/Melonbot',
		};
	},
});
