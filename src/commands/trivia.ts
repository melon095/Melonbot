import { TCommandContext } from './../Typings/types';
import { EPermissionLevel, ECommandFlags } from './../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';

export default class extends CommandModel {
	Name = 'trivia';
	Ping = false;
	Description =
		'Initiates a new trivia in the channel, Uses the api created by gazatu at [https://gazatu.xyz]';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = ['t'];
	Cooldown = 5;
	Params = [
		{ name: 'exclude', type: 'string' },
		{ name: 'include', type: 'string' },
	];
	Flags = [ECommandFlags.NO_EMOTE_PREPEND];
	Code = async (ctx: TCommandContext) => {
		if (ctx.channel.Trivia === null) {
			return this.Resolve();
		}

		if (ctx.input[0] && ['skip', 'stop'].includes(ctx.input[0].toLowerCase())) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			this.Resolve(ctx.channel.Trivia?.trySkip(ctx.user.username!));
		} else {
			this.Resolve(
				await ctx.channel.Trivia?.start(
					ctx.data.Params['exclude'] as string,
					ctx.data.Params['include'] as string,
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					ctx.user.username!,
				),
			);
		}
	};
	LongDescription = async (prefix: string) => [
		`Starts a new trivia in the channel.`,
		`Usage: ${prefix}trivia`,
		'',
		`Don't like some of the categories? Use the exclude and include parameters to filter them out.`,
		`Usage: ${prefix}trivia --exclude=[category1,category2]`,
		`**Note**: Don't use spaces between the commas and the category names.`,
		'',
		'You can also skip the current question with the skip parameter.',
		`Usage: ${prefix}trivia skip`,
		'However only the one who started the trivia can skip the question.',
	];
}
