interface UserTable {
	id: number;
	name: string;
	twitch_uid: string;
	first_seen: Date;
	role: UserRole;
}

type UserRole = 'user' | 'moderator' | 'admin';

export default UserTable;
export { UserTable, UserRole };
