import { Generated, Selectable, Insertable } from 'kysely';
import ChannelTable from './ChannelTable.js';

interface TimerTable {
	uuid: Generated<string>;
	/**
	 * {@link ChannelTable} that owns the timer
	 */
	owner: string;
	/**
	 * Unique name of the timer
	 */
	name: string;
	/**
	 * Interval in seconds
	 */
	interval: number;
	/**
	 * Message to send
	 */
	message: string;
	/**
	 * Whether the timer is enabled
	 */
	enabled: boolean;
	/**
	 * Optionally only allow the timer to be enabled if the title matches any of the stored titles
	 */
	titles: string[];
}

type SelectableTable = Selectable<TimerTable>;
type InsertableTable = Insertable<TimerTable>;

export default TimerTable;
export { TimerTable, SelectableTable, InsertableTable };
