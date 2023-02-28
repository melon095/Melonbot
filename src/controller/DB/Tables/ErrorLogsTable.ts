import { Generated } from 'kysely';

interface ErrorLogsTable {
	error_id: Generated<bigint>;
	error_message: string;
	timestamp: Generated<Date>;
}

export default ErrorLogsTable;
export { ErrorLogsTable };
