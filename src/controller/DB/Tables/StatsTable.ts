import ChannelTable from './ChannelTable';

interface StatsTable {
	/**
	 * Foreign key - references {@link ChannelTable.name ChannelTable.name}
	 */
	name: string;
	commands_handled: number;
}

export default StatsTable;
export { StatsTable };
