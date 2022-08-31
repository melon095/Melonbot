// @generated
// Automatically generated. Don't change this file manually.

import { channelsId } from './channels';

/**
 * Statistics tied to a channel
 */
export default interface stats {
	/**
	 * The name of the channel
	 * Index: idx_1745930_channel_unique
	 * Index: idx_1745930_fk_stats_channels_idx
	 */
	name: channelsId;

	/** How many commands has been run by the bot in this channel */
	commands_handled: number;
}
