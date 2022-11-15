import { CommandModel, TCommandContext, CommandResult, ArgType } from '../Models/Command.js';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';

import vm from 'node:vm';
import { Channel } from './../controller/Channel/index.js';
import TestPrehandler, { TestMod } from './../PreHandlers/test.js';

type PreHandlers = {
	test: TestMod;
};

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

export default class extends CommandModel<PreHandlers> {
	Name = 'testman';
	Ping = false;
	Description = 'Debug command';
	Permission = EPermissionLevel.ADMIN;
	OnlyOffline = false;
	Aliases = ['debug', 'js', 'eval'];
	Cooldown = 5;
	Params = [
		[ArgType.String, 'username'],
		[ArgType.String, 'id'],
	];
	Flags = [ECommandFlags.NO_BANPHRASE];
	PreHandlers = [TestPrehandler];
	Code = async (ctx: TCommandContext, mods: PreHandlers): Promise<CommandResult> => {
		return {
			Success: true,
			Result: `Yellow ${mods.test.Test} :)`,
		};

		if (ctx.input[0] === 'bot' && ctx.input[1] === 'join') {
			const { username, id } = ctx.data.Params;

			if (!username || !id) {
				return {
					Success: false,
					Result: 'You need to specify a username and an id',
				};
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
				return {
					Success: false,
					Result: 'You need to specify a username',
				};
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
