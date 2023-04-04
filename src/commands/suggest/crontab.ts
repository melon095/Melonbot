import { Selectable } from 'kysely';
import SuggestionsTable from '../../controller/DB/Tables/SuggestionsTable.js';
import { ResolveInternalID } from '../../controller/User/index.js';
import Helix from '../../Helix/index.js';

const UPDATE_INTERVAL = 1000 * 60 * 5; // 5 minutes
const CHECK_INTERVAL = 1000 * 60 * 8; // 8 minutes

const pendingSuggestionList: Selectable<SuggestionsTable>[] = [];

setInterval(async () => {
	Bot.Log.Info('Updating pending suggestions');

	const pendingSuggestions = await Bot.SQL.selectFrom('suggestions')
		.selectAll()
		.where('state', '=', 'pending')
		.execute();

	if (pendingSuggestions.length === 0) return;

	pendingSuggestionList.push(...pendingSuggestions);
}, UPDATE_INTERVAL);

setInterval(async () => {
	const finished = await Bot.SQL.selectFrom('suggestions')
		.selectAll()
		.where('state', '=', 'finished')
		.execute();

	if (finished.length === 0) return;

	for (const suggestion of finished) {
		const index = pendingSuggestionList.findIndex((s) => s.id === suggestion.id);

		if (index === -1) continue;

		const user = await ResolveInternalID(suggestion.user_id);

		if (!user) continue;

		pendingSuggestionList.splice(index, 1);

		Bot.Log.Info(`Notifying user ${user.TwitchUID} about finished suggestion ${suggestion.id}`);

		await Helix.Whisper(
			`FeelsDankMan 👋 Your suggestion '${suggestion.suggestion}' was finished!`,
			user.TwitchUID,
		).catch((error) => {
			Bot.Log.Error(error);
		});
	}
}, CHECK_INTERVAL);

export {};
