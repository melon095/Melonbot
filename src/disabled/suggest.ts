// import { Database, TCommandContext } from './../Typings/types';
// import { EPermissionLevel } from './../Typings/enums.js';
// import { CommandModel } from '../Models/Command.js';

// export default class extends CommandModel {
// 	Name = 'suggest';
// 	Ping = true;
// 	Description =
// 		'Allows a user to add a suggestion. This could be from adding new commands, to fixing bugs.';
// 	Permission = EPermissionLevel.VIEWER;
// 	OnlyOffline = false;
// 	Aliases = [];
// 	Cooldown = 60;
// 	Params = [];
// 	Flags = [];
// 	Code = async (ctx: TCommandContext) => {
// 		const joined = ctx.input.splice(0).toString().replace(/,/g, ' ');

// 		// const hasSuggested = await tools.query("SELECT suggestion FROM suggestions WHERE request_username = ?", [user['username']])
// 		// console.log(hasSuggested)
// 		// User has suggestions
// 		// if (hasSuggested.length !== 0) {
// 		// CBA DOING THIS NOW #[TODO]: FIX THIS!
// 		// const alreadSuggested = () => {
// 		//     for (var i = 0; i < hasSuggested.length; i++) {
// 		//         if(hasSuggested[i].suggestion === input)  {
// 		//             return true
// 		//         }
// 		//     }
// 		//     return false
// 		// }
// 		// if (alreadSuggested) {
// 		//     const id = await tools.query("SELECT suggestion_id FROM suggestions WHERE suggestion = ?", [input])
// 		//     console.log(id)
// 		//     return `Looks like you have already requested this, #${id.suggestion_id}`
// 		// } else {
// 		//     return `Suggestion has been added, #${await insert(input)}`
// 		// }
// 		// return `Suggestion has been added, #${await insert(input)}`
// 		// } else {
// 		Bot.SQL.query(
// 			'INSERT INTO suggestions (suggestion, request_username) VALUES (?, ?)',
// 			[joined, ctx.user.username],
// 		);
// 		const id = (
// 			await Bot.SQL.promisifyQuery<Database.suggestions>(
// 				'SELECT MAX(suggestion_id) as suggestion_id FROM suggestions WHERE request_username = ?',
// 				[ctx.user.username],
// 			)
// 		).SingleOrNull();
// 		if (id === null) {
// 			return this.Resolve('Suggestion added :)');
// 		}

// 		this.Resolve(`Suggestion has been added, #${id.suggestion_id}`);
// 	};
// }
