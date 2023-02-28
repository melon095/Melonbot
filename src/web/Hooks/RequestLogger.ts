import { FastifyInstance } from 'fastify';
import { InsertableWebRequest } from '../../controller/DB/Tables/WebRequestLogTable.js';

// Log request
export default function (fastify: FastifyInstance) {
	fastify.addHook('preValidation', async function (req) {
		if (req.url.startsWith('/assets/')) return;

		const { method, headers, body, query } = req;
		const endpoint = req.url;
		const request_ip = `${req.headers['x-forwarded-for']} (${req.socket.remoteAddress})`;

		let data: InsertableWebRequest = {
			endpoint,
			method,
			request_ip,
		};

		headers && (data.headers = JSON.stringify(headers));
		body && (data.body = JSON.stringify(body));
		query && (data.query = JSON.stringify(query));

		await Bot.SQL.insertInto('logs.web_request').values(data).execute();

		Bot.Log.Info(`[${request_ip}] ${method} ${endpoint}`);
	});
}
