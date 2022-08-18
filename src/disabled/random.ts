// import { TCommandContext } from './../Typings/types';
// import { EPermissionLevel } from './../Typings/enums.js';
// import { CommandModel } from '../Models/Command.js';

// function shuffle(input: string[]): string {
// 	let currentIndex = input.length,
// 		randomIndex;

// 	while (currentIndex != 0) {
// 		randomIndex = Math.floor(Math.random() * currentIndex);
// 		currentIndex--;

// 		[input[currentIndex], input[randomIndex]] = [
// 			input[randomIndex],
// 			input[currentIndex],
// 		];
// 	}
// 	return input.join(' ');
// }

// export default class extends CommandModel {
// 	Name = 'random';
// 	Ping = false;
// 	Description = 'Randomizes input - DISABLED';
// 	Permission = EPermissionLevel.ADMIN;
// 	OnlyOffline = false;
// 	Aliases = [];
// 	Cooldown = 5;
// 	Params = [];
// 	Flags = [];
// 	Code = async (ctx: TCommandContext) => {
// 		this.Resolve(shuffle(ctx.input.splice(0).toString().split(',')));
// 	};
// }
