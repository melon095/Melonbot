import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';

import vm from 'node:vm';
import { Channel } from './../controller/Channel/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function Execute(script: string, ctx: TCommandContext): Promise<object | string> {
	const crypto = await import('crypto');
	return new Promise((Resolve, Reject) => {
		const context = vm.createContext({
			crypto,
			version: process.version,
			ctx,
			Bot,
		});
		try {
			Resolve(
				new vm.Script(script).runInNewContext(context, {
					timeout: 2500,
				}),
			);
		} catch (e) {
			Reject(e);
		}
	});
}

export default class extends CommandModel {
	Name = 'testman';
	Ping = false;
	Description = 'Debug command';
	Permission = EPermissionLevel.ADMIN;
	OnlyOffline = false;
	Aliases = ['debug'];
	Cooldown = 5;
	Params = [
		{ name: 'username', type: 'string' },
		{ name: 'id', type: 'string' },
	];
	Flags = [ECommandFlags.NO_BANPHRASE, ECommandFlags.NO_EMOTE_PREPEND];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		if (ctx.input[0] === 'bot' && ctx.input[1] === 'join') {
			const { username, id } = ctx.data.Params;

			if (!username || !id) {
				return {
					Success: false,
					Result: 'You need to specify a username and an id',
				};
			}

			return await Channel.Join(username as string, id as string)
				.then(() => {
					return {
						Success: true,
						Result: 'Done...',
					};
				})
				.catch(() => {
					return {
						Success: false,
						Result: 'Something went wrong',
					};
				});
		}

		const script = `(async () => {"use strict"; \n${ctx.input.join(' ')}\n})()`;

		const res = await Execute(script, ctx);
		if (typeof res !== 'undefined') {
			return {
				Success: true,
				Result: JSON.stringify(res, null, 4),
			};
		} else {
			return {
				Success: true,
				Result: 'No result',
			};
		}
	};
}
