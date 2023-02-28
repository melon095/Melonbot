import { Generated } from 'kysely';

interface WebReqeustLogTable {
	id: Generated<number>;
	method: string;
	endpoint: string;
	request_ip: string;
	headers: string;
	query: string;
	body: string;
	timestamp: Date;
}

export default WebReqeustLogTable;
export { WebReqeustLogTable };
