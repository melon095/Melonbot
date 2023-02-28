import { Generated, Insertable } from 'kysely';

interface WebRequestLogTable {
	id: Generated<number>;
	method: string;
	endpoint: string;
	request_ip: string;
	headers?: string;
	query?: string;
	body?: string;
	timestamp: Generated<Date>;
}

type InsertableWebRequest = Insertable<WebRequestLogTable>;

export default WebRequestLogTable;
export { WebRequestLogTable, InsertableWebRequest };
