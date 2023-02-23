import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
	await fastify.register(import('./stats.js'), { prefix: '/stats' });
	await fastify.register(import('./commands.js'), { prefix: '/commands' });
	await fastify.register(import('./channel/index.js'), { prefix: '/channel' });
}
