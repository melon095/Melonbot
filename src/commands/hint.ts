import { TCommandContext } from './../Typings/types';
import { EPermissionLevel, ECommandFlags } from './../Typings/enums.js';
import { CommandModel } from '../Models/Command.js';

export default class extends CommandModel {
	Name = 'hint';
	Ping = false;
	Description = 'Displays the trivia hint.';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [];
	Flags = [ECommandFlags.NO_EMOTE_PREPEND];
	Code = async (ctx: TCommandContext) => {
		if (!ctx.channel.Trivia?.initiated) return this.Resolve();

		const xd = ctx.channel.Trivia.askHint();

		this.Resolve(`(Trivia) Hints(${xd.length[0]}/${xd.length[1]}) ${xd.copy}`);
	};
	LongDescription = async (prefix: string) => [
		`Get a hint for the current trivia question.`,
		`Usage: ${prefix}hint`,
	];
}
