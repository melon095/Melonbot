import { Database, TCommandContext } from './../Typings/types';
import { EPermissionLevel, ECommandFlags } from './../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';
import vm from 'node:vm';
import Helix from './../Helix/index.js';
import { Channel } from './../controller/Channel/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function Execute(
	script: string,
	ctx: TCommandContext,
): Promise<object | string> {
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
	Code = async (ctx: TCommandContext) => {
		if (ctx.input[0] === 'bot' && ctx.input[1] === 'join') {
			const { username, id } = ctx.data.Params;

			if (!username || !id) {
				this.Resolve('Missing username and or id parameter.');
				return;
			}

			await Channel.Join(username as string, id as string)
				.then(() => {
					this.Resolve('Done...');
				})
				.catch(() => {
					this.Resolve('Failed...');
				});
			return;
		}

		if (ctx.input[0] === 'migrate') {
			switch (ctx.input[1]) {
				// Quick fix lol.
				case 'eventsub': {
					const channels = (
						await Bot.SQL.promisifyQuery<Database.channels>(
							'SELECT `user_id` FROM `channels`',
						)
					).ArrayOrNull();

					if (channels === null) return;
					for (const channel of channels) {
						await Helix.EventSub.Create(
							'channel.moderator.add',
							'1',
							{
								broadcaster_user_id: channel.user_id,
							},
						);

						await Helix.EventSub.Create(
							'channel.moderator.remove',
							'1',
							{
								broadcaster_user_id: channel.user_id,
							},
						);
					}
				}

				default: {
					this.Resolve();
					break;
				}
			}
		} else {
			const script = `(async () => {"use strict"; \n${ctx.input.join(
				' ',
			)}\n})()`;

			try {
				const res = await Execute(script, ctx);
				if (typeof res !== 'undefined') {
					this.Resolve(JSON.stringify(res, null, 4));
				} else {
					this.Resolve('Done!');
				}
			} catch (e) {
				this.Reject(new Error(e as string));
			}
		}
	};
}
