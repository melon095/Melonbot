import { Generated } from 'kysely';

interface UserDataStoreTable {
	user: number;
	key: string;
	value: string;
	last_edited: Generated<Date>;
}

export default UserDataStoreTable;
export type { UserDataStoreTable };
