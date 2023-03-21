import { Generated } from 'kysely';

interface ChannelDataStoreTable {
	channel: string;
	key: string;
	value: string;
	last_edited: Generated<Date>;
}

export default ChannelDataStoreTable;
export type { ChannelDataStoreTable };
