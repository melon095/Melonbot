import { TCommandContext, ArgType } from '../../Models/Command.js';
import { ECommandFlags, EPermissionLevel } from './../../Typings/enums.js';

import vm from 'node:vm';
import { Channel } from './../../controller/Channel/index.js';
import { registerCommand } from '../../controller/Commands/Handler.js';

async function Execute(script: string, ctx: TCommandContext): Promise<object | string> {
	const crypto = await import('crypto');
	const context = vm.createContext({
		crypto,
		version: process.version,
		ctx,
		Bot,
	});
	const result = await new vm.Script(script).runInNewContext(context, {
		timeout: 2500,
	});

	return result;
}

registerCommand({
	Name: 'testman',
	Ping: false,
	Description: 'Debug command',
	Permission: EPermissionLevel.ADMIN,
	Aliases: ['debug', 'js', 'eval'],
	Cooldown: 5,
	Params: [
		[ArgType.String, 'username'],
		[ArgType.String, 'id'],
	],
	Flags: [ECommandFlags.NoBanphrase],
	PreHandlers: [],
	Code: async function (ctx) {
		if (ctx.input[0] === 'bot' && ctx.input[1] === 'join') {
			const { username, id } = ctx.data.Params;

			if (!username || !id) {
				this.EarlyEnd.InvalidInput('Specify a username and an id');
			}

			const user = await Bot.User.Get(username as string, id as string);

			if (!user) {
				return {
					Success: false,
					Result: 'I have never seen this user before.',
				};
			}

			return await Channel.Join(user)
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
		} else if (ctx.input[0] === 'user') {
			const username = ctx.input[1];

			if (!username) {
				this.EarlyEnd.InvalidInput('Specify a username input[1]');
			}

			const user = await Bot.User.ResolveUsername(username);

			if (!user) {
				return {
					Success: false,
					Result: 'I have never seen this user before.',
				};
			}

			return {
				Success: true,
				Result: user.toString(),
			};
		} else if (ctx.input[0] === 'earlyend') {
			if (ctx.input[1] === 'api') this.EarlyEnd.ThirdPartyError('This is an early end');

			this.EarlyEnd.InvalidInput('This is an early end');
		}

		const script = `(async () => {"use strict"; \n${ctx.input.join(' ')}\n})()`;

		let response: string = '';

		try {
			const res = await Execute(script, ctx);
			if (typeof res !== 'undefined') {
				response = JSON.stringify(res, null, 4);
			} else {
				response = 'No result';
			}
		} catch (e) {
			response = `Eval machine broke: ${
				typeof (e as Error).message !== 'undefined' ? (e as Error).message : (e as string)
			} `;
		}

		return {
			Success: true,
			Result: response,
		};
	},
});
