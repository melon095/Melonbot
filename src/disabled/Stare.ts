// import { TCommandContext } from './../Typings/types';
// import { EPermissionLevel } from './../Typings/enums.js';
// import { CommandModel } from '../Models/Command.js';

// export default class extends CommandModel {
// 	Name = 'Stare';
// 	Ping = false;
// 	Description =
// 		'Pings the user with a Stare . Stare is a 7TV emote depicting a pepe looking at you.';
// 	Permission = EPermissionLevel.VIEWER;
// 	OnlyOffline = false;
// 	Aliases = [];
// 	Cooldown = 5;
// 	Params = [];
// 	Flags = [];
// 	Code = async (ctx: TCommandContext) => {
// 		if (ctx.input.length >= 1) {
// 			this.Resolve(`@${ctx.input[0]}, Stare`);
// 		} else {
// 			this.Resolve(`@${ctx.user['display-name']}, Stare`);
// 		}
// 	};
// }
