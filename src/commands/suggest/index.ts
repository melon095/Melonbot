import { registerCommand } from '../../controller/Commands/Handler.js';
import { ECommandFlags, EPermissionLevel } from './../../Typings/enums.js';

if (process.env.TYPE === 'BOT') {
	await import('./crontab.js');
}

registerCommand({
	Name: 'suggest',
	Description: 'Suggest a new feature or a bug.',
	Permission: EPermissionLevel.VIEWER,
	Aliases: [],
	Cooldown: 20,
	Params: [],
	Flags: [ECommandFlags.ResponseIsReply],
	PreHandlers: [],
	Code: async function (ctx) {
		ctx.input.length === 0 && this.EarlyEnd.InvalidInput('You must provide a suggestion.');

		const suggestion = ctx.input.join(' ');

		await Bot.SQL.insertInto('suggestions')
			.values({
				user_id: ctx.user.ID,
				suggestion,
				state: 'pending',
			})
			.execute();

		return { Success: true, Result: 'Submitted :)' };
	},
	LongDescription: async function (_, user) {
		if (!user) return [];

		try {
			const suggestions = await Bot.SQL.selectFrom('suggestions')
				.selectAll()
				.where('user_id', '=', user.ID)
				.execute()
				.then((rows) => rows.filter(({ state }) => state === 'pending'));

			if (suggestions.length === 0) return [];

			return [
				`You have ${suggestions.length} pending suggestions:`,

				...suggestions.map(({ id, suggestion }, index) => {
					return `${index + 1}. '${suggestion}' (ID: ${id})`;
				}),
			];
		} catch {
			return [];
		}
	},
});
