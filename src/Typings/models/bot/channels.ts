// @generated
// Automatically generated. Don't change this file manually.

export type channelsId = string & { ' __flavor'?: 'channels' };

export default interface channels {
	/**
	 * Index: idx_1745895_name_unique
	 * Primary key. Index: idx_1745895_primary
	 */
	name: channelsId;

	/** Index: idx_1745895_user_id_unique */
	user_id: string;

	live: boolean;

	bot_permission: number;

	disabled_commands: string[];
}
