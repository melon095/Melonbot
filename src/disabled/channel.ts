// import { TCommandContext } from './../Typings/types';
// import { EPermissionLevel, ECommandFlags } from './../Typings/enums.js';
// import { CommandModel } from '../Models/Command.js';

// export default class extends CommandModel {
// 	Name = 'channel';
// 	Ping = true;
// 	Description =
// 		'Update settings per channel, disable enable command, banphrase - REGEX, PB1 (pajbot1. URL Should only contain base url [https://bot.my-domain.com]) -- Does not support pajbot2';
// 	Permission = EPermissionLevel.MOD;
// 	OnlyOffline = false;
// 	Aliases = [];
// 	Cooldown = 5;
// 	Params = [
// 		// banphrase
// 		{ name: 'type', type: 'string' },
// 		{ name: 'url', type: 'string' },
// 		{ name: 'regex', type: 'string' },
// 	];
// 	Flags = [ECommandFlags.NO_BANPHRASE];
// 	Code = async (ctx: TCommandContext) => {
// 		let res = '';
// 		switch (ctx.input[0]) {
// 			case 'trivia': {
// 				// switch (ctx.input[1]) {
// 				//     case "exclude": {

// 				//         const data =
// 				//             await Bot.SQL.promisifyQuery("SELECT `filter` FROM `trivia` WHERE `user_id` = ?", [ctx.channel.Id]);

// 				//         if (!data)
// 				//             break

// 				//         break;
// 				//     }

// 				//     case "include": {

// 				//         break;
// 				//     }

// 				//     default: {
// 				//         res = "exclude or include";
// 				//         break;
// 				//     }
// 				// }
// 				res = 'Not implemented :)';
// 				break;
// 			}

// 			case 'disable': {
// 				if (ctx.channel.Filter.includes(ctx.input[1]))
// 					res = 'SuperVinlin Already disabled!';
// 				else {
// 					Bot.SQL.query(
// 						"UPDATE `channels` SET `disabled_commands` = IF(JSON_TYPE(`disabled_commands`) <=> 'ARRAY', `disabled_commands`, JSON_ARRAY()), `disabled_commands` = JSON_ARRAY_APPEND(`disabled_commands`, '$', ?) WHERE `user_id` = ?",
// 						[ctx.input[1], ctx.channel.Id],
// 					);
// 					res = `SuperVinlin disabled ${ctx.input[1]}`;
// 					ctx.channel.updateFilter();
// 				}

// 				break;
// 			}

// 			case 'enable': {
// 				if (!ctx.channel.Filter.includes(ctx.input[1]))
// 					res = 'SuperVinlin Already enabled!';
// 				else {
// 					await Bot.SQL.promisifyQuery(
// 						[
// 							'UPDATE `channels`',
// 							'SET `disabled_commands` = ',
// 							'JSON_REMOVE(`disabled_commands`, ',
// 							'JSON_UNQUOTE( ',
// 							"JSON_SEARCH(`disabled_commands`, 'one', ?)",
// 							') ',
// 							') ',
// 							'WHERE `user_id` = ?',
// 						].join(''),
// 						[ctx.input[1], ctx.channel.Id],
// 					);
// 					res = `SuperVinlin enabled ${ctx.input[1]}`;
// 					ctx.channel.updateFilter();
// 				}

// 				break;
// 			}

// 			case 'banphrase': {
// 				const settings = {
// 					type: '',
// 					url: '',
// 					regex: '',
// 				};
// 				for (const param in ctx.data.Params) {
// 					if (ctx.data.Params[param].toString().length > 0) {
// 						const value = ctx.data.Params[param];
// 						console.log(ctx.data.Params[param]);
// 						switch (param) {
// 							case 'type': {
// 								if (
// 									!['REGEX', 'PB1'].includes(value as string)
// 								) {
// 									res =
// 										'NotLikeThis Not a correct banphrase type';
// 									break;
// 								}

// 								settings.type = value as string;

// 								break;
// 							}

// 							case 'url': {
// 								settings.url = value as string;

// 								break;
// 							}

// 							case 'regex': {
// 								if (
// 									(value as string)[0] === '/' &&
// 									(value as string)[
// 										(value as string).length - 1
// 									] === '/'
// 								) {
// 									settings.regex = value as string;
// 								} else {
// 									res =
// 										'NotLikeThis regex requires to have a / between its value. Example: /[0-1]/';
// 									break;
// 								}

// 								break;
// 							}

// 							default:
// 								break;
// 						}
// 					}
// 				}

// 				await Bot.SQL.promisifyQuery(
// 					'INSERT IGNORE INTO `banphrases` VALUES (?, JSON_ARRAY())',
// 					[ctx.channel.Name],
// 				);

// 				Bot.SQL.query(
// 					"UPDATE banphrases SET `Phrase` = JSON_ARRAY_APPEND(`Phrase`, '$', JSON_COMPACT(?)) WHERE `channel` = ?",
// 					[JSON.stringify(settings), ctx.channel.Name],
// 				);

// 				ctx.channel.Banphrase.Update();
// 				res = `BloodTrail added banphrase, type: ${
// 					settings.type
// 				}, Value: ${settings.regex || settings.url}`;
// 				break;
// 			}

// 			default: {
// 				res = 'Not an option';
// 			}
// 		}

// 		this.Resolve(res);
// 	};
// }
