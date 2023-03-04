import { registerCommand } from '../controller/Commands/Handler.js';
import { EPermissionLevel } from './../Typings/enums.js';
registerCommand({
	Name: 'hint',
	Ping: false,
	Description: 'Displays the trivia hint.',
	Permission: EPermissionLevel.VIEWER,
	OnlyOffline: false,
	Aliases: [],
	Cooldown: 5,
	Params: [],
	Flags: [],
	PreHandlers: [],
	Code: async function (ctx) {
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
	},
	LongDescription: async (prefix) => [
		`Get a hint for the current trivia question.`,
		`Usage: ${prefix}hint`,
	],
});
