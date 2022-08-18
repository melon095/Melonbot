// import { TCommandContext } from './../Typings/types';
// import { EPermissionLevel } from './../Typings/enums.js';
// import { CommandModel } from '../Models/Command.js';
// import axios from 'axios';

// const factApiList = new Map();
// factApiList.set(0, 'https://github.com/sameerkumar18/useless-facts-api');
// factApiList.set(1, 'https://uselessfacts.jsph.pl/random.json');
// factApiList.set(3, 'https://uselessfacts.net/api/posts=d=');

// const randomApi = function (): number {
// 	const keys = Array.from(factApiList.keys());
// 	return keys[Math.floor(Math.random() * keys.length)];
// };

// const randomDate = (earliestDate: Date, latestDate: Date): string => {
// 	return new Date(
// 		earliestDate.getTime() +
// 			Math.random() * (latestDate.getTime() - earliestDate.getTime()),
// 	).toJSON();
// };

// export default class extends CommandModel {
// 	Name = 'funfact';
// 	Ping = true;
// 	Description = 'Tells a fun fact 4Head';
// 	Permission = EPermissionLevel.VIEWER;
// 	OnlyOffline = false;
// 	Aliases = ['ff'];
// 	Cooldown = 10;
// 	Params = [];
// 	Flags = [];
// 	// eslint-disable-next-line @typescript-eslint/no-unused-vars
// 	Code = async (ctx: TCommandContext) => {
// 		let answer = '';

// 		switch (randomApi()) {
// 			case 0: {
// 				answer = await axios(
// 					'https://useless-facts.sameerkumar.website/api',
// 					{
// 						method: 'GET',
// 						headers: {
// 							accept: 'application/json',
// 						},
// 					},
// 				)
// 					.then((data) => data.data)
// 					.then((data) => data.data)
// 					.then((data) => {
// 						return data;
// 					})
// 					.catch((error) => {
// 						console.log(error);
// 						throw error;
// 					});
// 				break;
// 			}

// 			case 1: {
// 				answer = await axios(
// 					'https://uselessfacts.jsph.pl/random.json?language=en',
// 					{
// 						method: 'GET',
// 						headers: {
// 							accept: 'application/json',
// 						},
// 					},
// 				)
// 					.then((data) => data.data)
// 					.then((data) => {
// 						return data.text;
// 					})
// 					.catch((error) => {
// 						console.log(error);
// 						throw error;
// 					});
// 				break;
// 			}

// 			case 2: {
// 				answer = await axios(
// 					`https://uselessfacts.net/api/posts?d=${randomDate(
// 						new Date(2017, 0, 1),
// 						new Date(),
// 					)}`,
// 					{
// 						method: 'GET',
// 						headers: {
// 							accept: 'application/json',
// 						},
// 					},
// 				)
// 					.then((data) => data.data)
// 					.then((data) => {
// 						const fact =
// 							data[Math.floor(Math.random() * data.length)].title;

// 						if (fact.length === 0) {
// 							return 'NotLikeThis . Sorry! Unable to find any fun facts.';
// 						} else {
// 							return fact;
// 						}
// 					})
// 					.catch((error) => {
// 						console.log(error);
// 						throw error;
// 					});
// 				break;
// 			}

// 			default: {
// 				answer = await axios(
// 					`https://uselessfacts.net/api/posts?d=${randomDate(
// 						new Date(2017, 0, 1),
// 						new Date(),
// 					)}`,
// 					{
// 						method: 'GET',
// 						headers: {
// 							accept: 'application/json',
// 						},
// 					},
// 				)
// 					.then((data) => data.data)
// 					.then((data) => {
// 						const fact =
// 							data[Math.floor(Math.random() * data.length)].title;

// 						if (fact.length === 0) {
// 							return 'NotLikeThis . Sorry! Unable to find any fun facts.';
// 						} else {
// 							return fact;
// 						}
// 					})
// 					.catch((error) => {
// 						console.log(error);
// 						throw error;
// 					});
// 			}
// 		}

// 		this.Resolve(answer);
// 	};
// }
