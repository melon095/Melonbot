import { Selectable } from 'kysely';
import SuggestionsTable from '../../controller/DB/Tables/SuggestionsTable.js';
import { ResolveInternalID } from '../../controller/User/index.js';
import Helix from '../../Helix';

const VERY_PRIVATE_BOT_USER_TOKEN = process.env.MELONBOT_USERTOKEN;
const UPDATE_INTERVAL = 1000 * 60 * 30; // 5 minutes
const CHECK_INTERVAL = 1000 * 60 * 8; // 8 minutes

const pendingSuggestionList: Selectable<SuggestionsTable>[] = [];

setInterval(async () => {
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

		await Helix.Whisper(
			`FeelsDankMan 🖐 Your suggestion '${suggestion.suggestion}' was finished!`,
			user.TwitchUID,
		);
	}
}, CHECK_INTERVAL);

export {};
