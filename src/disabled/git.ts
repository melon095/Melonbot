// import { TCommandContext } from './../Typings/types';
// import { EPermissionLevel } from './../Typings/enums.js';
// import { CommandModel } from '../Models/Command.js';
// import { exec } from 'node:child_process';
// import { promisify } from 'node:util';
// import { openSync, closeSync, existsSync, unlinkSync } from 'node:fs';
// import { resolve } from 'node:path';

// export const PM2FILENAME = resolve(process.cwd(), './.pm2.lock');

// export default class extends CommandModel {
// 	Name = 'git';
// 	Ping = false;
// 	Description = 'Fetch latest update from github.';
// 	Permission = EPermissionLevel.ADMIN;
// 	OnlyOffline = false;
// 	Aliases = ['reset'];
// 	Cooldown = 5;
// 	Params = [];
// 	Flags = [];
// 	Code = async (ctx: TCommandContext) => {
// 		try {
// 			const shell = promisify(exec);
// 			const say = (a: string) =>
// 				ctx.channel.say(a, { NoEmoteAtStart: true });

// 			const queue = [];

// 			queue.push(async () => {
// 				say('monkaS git pull origin master');
// 				const { stdout, stderr } = await shell(
// 					`git -C ${process.cwd()} pull origin master`,
// 				);
// 				console.log('Pull from git', { stdout, stderr });
// 				const a = await shell(`npm update`, { cwd: process.cwd() });
// 				console.log({ stdout: a.stdout, stderr: a.stderr });
// 			});
// 			queue.push(async () => {
// 				say('monkaS Rebuilding...');
// 				const { stdout, stderr } = await shell('npm run build', {
// 					cwd: process.cwd(),
// 				});
// 				console.log('npm run build', { stdout, stderr });
// 			});
// 			queue.push(async () => {
// 				say('monkaS Restarting...');
// 				if (existsSync(PM2FILENAME)) unlinkSync(PM2FILENAME);

// 				closeSync(openSync(PM2FILENAME, 'w'));
// 				await shell('pm2 restart Bot web');
// 			});

// 			for (const lol of queue) await lol();
// 		} catch (err) {
// 			this.Reject(new Error(err as string));
// 		}
// 	};
// }
