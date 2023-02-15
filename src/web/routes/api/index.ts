import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
	await fastify.register(import('./v1/index.js'), { prefix: '/v1' });
	await fastify.register(import('./auth/index.js'), { prefix: '/auth' });
}
