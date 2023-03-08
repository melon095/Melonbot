import { Generated, Insertable, Selectable } from 'kysely';

interface UserTable {
	id: Generated<number>;
	name: string;
	twitch_uid: string;
	first_seen: Generated<Date>;
	role: Generated<UserRole>;
}

type UserRole = 'user' | 'moderator' | 'admin';
type SelectableUserTable = Selectable<UserTable>;
type InsertableUserTable = Insertable<UserTable>;

export default UserTable;
export { UserTable, UserRole, SelectableUserTable, InsertableUserTable };
