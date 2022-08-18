// import { ReadFolderStats, YMD } from './../tools/tools.js';
// import fs from 'node:fs';
// import { readFile } from 'node:fs/promises';
// import { Database, TStatsFile, TCommandContext } from './../Typings/types';
// import { EPermissionLevel } from './../Typings/enums.js';
// import { CommandModel } from '../Models/Command.js';

// // Every stats that can be triggered.
// const stats = [
// 	'.', // indexOf for some reason does not work on index 0.
// 	'forsen', // forsen count 4Head.
// ];

// type Stat = {
// 	daysCounting: number;
// 	alltime: number;
// 	today: number;
// 	average: number;
// };

// function daysSinceCount(array: string[]): number {
// 	const oldest = array.reduce((a, b) => {
// 		return Date.parse(a) > Date.parse(b) ? b : a;
// 	});

// 	// FeelsGoodMan parenthesis haven.
// 	return Math.round(
// 		(new Date().getTime() - new Date(oldest).getTime()) /
// 			(1000 * 3600 * 24),
// 	);
// }

// function help(): string {
// 	let returnData;

// 	for (let i = 0; i < stats.length - 1; i++) {
// 		if (i === 0) {
// 			returnData = `${stats[1]} `;
// 		} else {
// 			returnData += `| ${stats[i + 1]}`;
// 		}
// 	}

// 	// [TODO]: Add a way to check stats per date.
// 	return `Stats: ${returnData}`;
// }

// async function getStat(stat: string, channel: string): Promise<Stat> {
// 	// eslint-disable-next-line no-async-promise-executor
// 	return new Promise(async (Resolve) => {
// 		try {
// 			const dir = fs.readdirSync(`${process.cwd()}/stats`, {
// 				withFileTypes: true,
// 			});
// 			const sqlStat = (
// 				await Bot.SQL.promisifyQuery<Database.stats>(
// 					`SELECT ${stat} FROM stats WHERE name = ?`,
// 					[channel],
// 				)
// 			).SingleOrNull();
// 			if (sqlStat === null) {
// 				return Resolve({
// 					daysCounting: NaN,
// 					alltime: NaN,
// 					today: NaN,
// 					average: NaN,
// 				});
// 			}

// 			const file = await readFile(
// 				`${process.cwd()}/stats/${YMD()}.json`,
// 				'utf-8',
// 			).then((data) => JSON.parse(data));
// 			const asd = await ReadFolderStats();
// 			const average: number[] = [];

// 			for (const elements of asd) {
// 				if (elements.channel === channel) {
// 					average.push(elements[stat as never]);
// 				}
// 			}
// 			const today = file
// 				.map((c: TStatsFile, idx: number) => {
// 					if (c['channel'] === channel) {
// 						return file[idx][stat];
// 					}
// 				})
// 				.filter(Number);

// 			return Resolve({
// 				daysCounting: daysSinceCount(
// 					dir.map((file) => file.name.split('.')[0]),
// 				),
// 				alltime: Number(sqlStat[stat as never]),
// 				today: Number(today),
// 				average: Number(
// 					(
// 						average.reduce((a, b) => a + b, 0) / average.length
// 					).toFixed(0),
// 				),
// 			});
// 		} catch (e) {
// 			Bot.HandleErrors('getStat', new Error(e as never));
// 			return Resolve({
// 				daysCounting: NaN,
// 				alltime: NaN,
// 				today: NaN,
// 				average: NaN,
// 			});
// 		}
// 	});
// }

// export default class extends CommandModel {
// 	Name = 'stats';
// 	Ping = true;
// 	Description =
// 		"Returns stats about certain things. This can be configured to anything. Example NymN channel: 'melon stats forsen' Says the total amount of times your chat has said 'forsen', and today.";
// 	Permission = EPermissionLevel.VIEWER;
// 	OnlyOffline = false;
// 	Aliases = [];
// 	Cooldown = 5;
// 	Params = [];
// 	Flags = [];
// 	Code = async (ctx: TCommandContext) => {
// 		// If no stat was specified
// 		if (typeof ctx.input[0] === 'undefined') {
// 			return this.Resolve(help());
// 		} else {
// 			const stat = ctx.input[0].toLowerCase();
// 			// If the user chose a stat that exist
// 			if (stats.indexOf(stat) !== -1 && stat[0] !== '.') {
// 				const a = await getStat(stat, ctx.channel.Name);
// 				if (stat === 'help') {
// 					return this.Resolve(help());
// 				}
// 				return this.Resolve(
// 					`[${stat}] Counting for ${a.daysCounting} days. Total ${a.alltime}. Today ${a.today}. Average ${a.average}`,
// 				);
// 			} else {
// 				return this.Resolve(`Not in my database PoroSad`);
// 			}
// 		}
// 	};
// }
