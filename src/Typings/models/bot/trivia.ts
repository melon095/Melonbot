// @generated
// Automatically generated. Don't change this file manually.

type TFilter = {
	exclude: string[];
	include: string[];
};

type TLeaderboard = {
	username: string;
	score: number;
};

export type triviaId = string & { ' __flavor'?: 'trivia' };

export default interface trivia {
	channel: string;

	/**
	 * Index: idx_1745950_fk_trivia_channels1_idx
	 * Primary key. Index: idx_1745950_primary
	 */
	user_id: triviaId;

	/** Formatted as Milliseconds */
	cooldown: number;

	/** filter: {
    exclude: string[],
    include: string[]
} */
	filter: TFilter;

	leaderboard: TLeaderboard[];
}
