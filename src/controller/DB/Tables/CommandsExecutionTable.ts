import { Generated } from 'kysely';

interface CommandsExecutionTable {
	id: Generated<number>;
	user_id: string;
	username: string;
	success: boolean;
	command: string;
	args: string[];
	result: boolean;
	channel: string;
}

export default CommandsExecutionTable;
export { CommandsExecutionTable };
