import { FastifyInstance } from 'fastify';

type WebRequestLog = {
	method: string;
	endpoint: string;
	request_ip: string;
	headers: string | null;
	query: string | null;
	body: string | null;
};

// Log request
export default function (fastify: FastifyInstance) {
	fastify.addHook('preValidation', async function (req) {
		if (req.url.startsWith('/assets/')) return Promise.resolve(); // Requires to be async

		const { method, headers, body, query } = req;
		const endpoint = req.url;
		const request_ip = `${req.headers['x-forwarded-for']} (${req.socket.remoteAddress})`;

		const data: WebRequestLog = {
			endpoint,
			method,
			request_ip,
			headers: JSON.stringify(headers) || null,
			body: JSON.stringify(body) || null,
			query: JSON.stringify(query) || null,
		};

		await Bot.SQL.Query`
            INSERT INTO logs.web_request ${Bot.SQL.Get(data)}
        `;

		Bot.Log.Info(`[${request_ip}] ${method} ${endpoint}`);
	});
}
