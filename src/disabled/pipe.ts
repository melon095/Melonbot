// import { TCommandContext } from './../Typings/types';
// import { EPermissionLevel } from './../Typings/enums.js';
// import { CommandModel } from '../Models/Command.js';

// // function FindPipe(input: string[]) {
// //     for (const [index, element] of input.entries()) {
// //         if (element === '|') return index
// //     }
// // }

// // async function Command(channel: string, user: ChatUserstate, input: string[], perm: number, command: string) {
// //     // const commands = requireDir("./");
// //     try {
// //         if(typeof commands[command] === "undefined") {
// //             return `${user.username} undefined command FeelsDankMan`;
// //         }
// //         return await commands[command].execute(channel, user, input, perm);
// //     } catch (err) {
// //         console.log(err)
// //         return `0 ${err}`
// //     }
// // }

// /*
//     ###################
//     # TOO LAZY TO FIX #
//     ###################
// */
// export default class extends CommandModel {
// 	Name = 'pipe';
// 	Ping = false;
// 	Description =
// 		'Pipes out the output of a command to another command. Only supports two commands, Example: pipe say 10 Okayge FeelsGoodMan | random - DISABLED';
// 	Permission = EPermissionLevel.ADMIN;
// 	OnlyOffline = false;
// 	Aliases = [];
// 	Cooldown = 5;
// 	Params = [];
// 	Flags = [];
// 	// eslint-disable-next-line @typescript-eslint/no-unused-vars
// 	Code = async (ctx: TCommandContext) => {
// 		this.Resolve('Disabled');
// 		// const pipe = FindPipe(ctx.input);

// 		// if (typeof pipe === "undefined") {
// 		//     return {
// 		//         success: false,
// 		//         message: ""
// 		//     }
// 		// }

// 		// const firstInput = ctx.input.splice(1, pipe - 1)
// 		// const firstCommand = ctx.input[0]
// 		// const secondCommand = ctx.input[2]

// 		// // First command
// 		// console.log(firstCommand)
// 		// console.log(firstInput)
// 		// console.log(secondCommand)
// 		// console.log(pipe)

// 		// const first = await Command(ctx.channel.name, ctx.user, firstInput, 100, firstCommand);
// 		// if(first.substr(0, 0) === '0') {
// 		//     return first.substr(1, first.length)
// 		// }
// 		// const firstArr = first.split(" ");

// 		// // Second command
// 		// const second = await Command(ctx.channel.name, ctx.user, firstArr, 100, secondCommand)
// 		// if(second.substr(0, 0) === '0') {
// 		//     return second.substr(1, second.length)
// 		// }
// 		// return {
// 		//     success: true,
// 		//     message: "foo"
// 		// }
// 	};
// }
