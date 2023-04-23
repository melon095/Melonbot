import { Generated } from 'kysely';
import { EPermissionLevel } from '../../../Typings/enums.js';
import UserTable from './UserTable.js';

interface CommandTable {
	id: Generated<bigint>;
	name: string;
	description: string;
	/**
	 * The permission level required to use the command.
	 *
	 * {0 = Viewer} Everyone can use the command.
	 *
	 * {1 = VIP} Only VIPs and above can use the command.
	 *
	 * {2 = Moderator} Only moderators and above can use the command.
	 *
	 * {3 = Broadcaster} Only the broadcaster can use the command.
	 *
	 * {4 = Admin} Only {@link UserTable.role users} with the role at admin or higher can use the command.
	 */
	perm: number;
}

type CommandPermissions = 'Viewer' | 'VIP' | 'Moderator' | 'Broadcaster' | 'Admin';

function CommandPermissionToString(val: EPermissionLevel | number): CommandPermissions {
	switch (val) {
		case 0:
			return 'Viewer';
		case 1:
			return 'VIP';
		case 2:
			return 'Moderator';
		case 3:
			return 'Broadcaster';
		case 4:
			return 'Admin';
		default:
			return 'Viewer';
	}
}

// function CommandModeToDatabase(mode: CommandPermissions): number {
// 	switch (mode) {
// 		case 'Viewer':
// 			return 0;
// 		case 'VIP':
// 			return 1;
// 		case 'Moderator':
// 			return 2;
// 		case 'Broadcaster':
// 			return 3;
// 		case 'Admin':
// 			return 4;
// 		default:
// 			return 0;
// 	}
// }

export default CommandTable;
export { CommandPermissionToString, CommandPermissions, CommandTable };
