import { Generated } from 'kysely';

interface SuggestionsTable {
	id: Generated<string>;
	suggestion: string;
	user_id: string;
	state: SuggestionState;
}

type SuggestionState = 'pending' | 'finished' | 'denied';

export default SuggestionsTable;
export { SuggestionsTable, SuggestionState };
