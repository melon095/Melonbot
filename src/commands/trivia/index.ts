import { registerCommand } from '../../controller/Commands/Handler.js';
import { ArgType } from '../../Models/Command.js';
import { EPermissionLevel } from './../../Typings/enums.js';

registerCommand({
	Name: 'trivia',
	Ping: false,
	Description:
		'Initiates a new trivia in the channel, Uses the api created by gazatu at [https://gazatu.xyz]',
	Permission: EPermissionLevel.VIEWER,
	Aliases: ['t'],
	Cooldown: 5,
	Params: [
		[ArgType.String, 'exclude'],
		[ArgType.String, 'include'],
	],
	Flags: [],
	PreHandlers: [],
	Code: async function (ctx) {
		if (ctx.channel.Trivia === null) {
			return {
				Success: false,
				Result: '',
			};
		}

		const isSkip = ctx.input[0] && ['skip', 'stop'].includes(ctx.input[0].toLowerCase());

		if (isSkip) {
			return {
				Success: true,
				Result: ctx.channel.Trivia.trySkip(ctx.user.Name),
			};
		}

		const exclude = ctx.data.Params['exclude'] as string;
		const include = ctx.data.Params['include'] as string;

		await ctx.channel.Trivia?.start(exclude, include, ctx.user.Name);

		return {
			Success: true,
			Result: '',
		};
	},
	LongDescription: async (prefix) => [
		`Starts a new trivia in the channel.`,
		`Usage: ${prefix}trivia`,
		'',
		'-e, --exclude "[category,category2]"',
		'   Excludes a category from the trivia',
		'',
		'-i, --include "[category,category2]"',
		'   Includes only the specified categories in the trivia',
		'You can also skip the current question.',
		`Usage: ${prefix}trivia skip`,
		'However only the one who started the trivia can skip the question.',
	],
});
