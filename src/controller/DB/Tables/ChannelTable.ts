interface ChannelTable {
	name: string;
	user_id: string;
	live: boolean;
	/**
	 * Bot permission defines the permission level of the bot in the channel.
	 *
	 * {0 = Read} Means the bot won't respond to any messages.
	 *
	 * {1 = Write} Bot behaves normally, allowing all commands.
	 *  Message interval -- 1.25 seconds.
	 *
	 * {2 = VIP}
	 *  Message interval -- 0.25 seconds.
	 *
	 * {3 = Moderator}
	 *  Message interval -- 0.05 seconds.
	 *
	 * {4 = Bot} Own channel
	 */
	bot_permission: number;
	/**
	 * @deprecated
	 */
	disabled_commands: string;
}

type PermissionMode = 'Read' | 'Write' | 'VIP' | 'Moderator' | 'Bot';

/**
 * Converts the database stored permission value to a mode.
 */
function DatabaseToMode(value: number): PermissionMode {
	switch (value) {
		case 0:
			return 'Read';
		case 1:
			return 'Write';
		case 2:
			return 'VIP';
		case 3:
			return 'Moderator';
		default:
			return 'Read';
	}
}

/**
 * Converts a permission mode to the equivalent message-interval value.
 */
function PermissionModeToCooldown(mode: PermissionMode): number | null {
	switch (mode) {
		case 'Read':
			return null;
		case 'Write':
			return 1250;
		case 'VIP':
			return 250;
		case 'Moderator':
			return 50;
		default:
			return null;
	}
}

export default ChannelTable;
export { ChannelTable, PermissionMode, PermissionModeToCooldown, DatabaseToMode };
