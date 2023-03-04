import { registerCommand } from '../../controller/Commands/Handler.js';
import { EPermissionLevel } from './../../Typings/enums.js';

registerCommand({
	Name: 'say',
	Ping: false,
	Description: 'Says the direct input.',
	Permission: EPermissionLevel.ADMIN,
	OnlyOffline: false,
	Aliases: [],
	Cooldown: 5,
	Params: [],
	Flags: [],
	PreHandlers: [],
	Code: async function (ctx) {
		return { Success: true, Result: ctx.input.join(' ') };
	},
});
