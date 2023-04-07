interface ChannelTable {
	name: string;
	user_id: string;
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
}

type PermissionMode = 'Read' | 'Write' | 'VIP' | 'Moderator' | 'Bot';

/**
 * Converts the database stored permission value to a mode.
 */
function ChannelDatabaseToMode(value: number): PermissionMode {
	switch (value) {
		case 0:
			return 'Read';
		case 1:
			return 'Write';
		case 2:
			return 'VIP';
		case 3:
			return 'Moderator';
		case 4:
			return 'Bot';
		default:
			return 'Read';
	}
}

function PermissionModeToDatabase(mode: PermissionMode): number {
	switch (mode) {
		case 'Read':
			return 0;
		case 'Write':
			return 1;
		case 'VIP':
			return 2;
		case 'Moderator':
			return 3;
		case 'Bot':
			return 4;
		default:
			return 0;
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
		case 'Bot':
			return 0;
		default:
			return null;
	}
}

export default ChannelTable;
export {
	ChannelTable,
	PermissionMode,
	PermissionModeToCooldown,
	ChannelDatabaseToMode,
	PermissionModeToDatabase,
};
