import { CommandModel, TCommandContext, CommandResult } from '../Models/Command.js';
import { ECommandFlags, EPermissionLevel } from './../Typings/enums.js';

export default class extends CommandModel {
	Name = 'hint';
	Ping = false;
	Description = 'Displays the trivia hint.';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [];
	Flags = [];
	PreHandlers = [];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		if (!ctx.channel.Trivia?.initiated)
			return {
				Success: false,
				Result: '',
			};

		const xd = ctx.channel.Trivia.askHint();

		return {
			Success: true,
			Result: `(Trivia) Hints(${xd.length[0]}/${xd.length[1]}) ${xd.copy}`,
		};
	};
	LongDescription = async (prefix: string) => [
		`Get a hint for the current trivia question.`,
		`Usage: ${prefix}hint`,
	];
}
