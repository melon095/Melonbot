import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
	fastify.register(import('./twitch.js'), { prefix: '/twitch' });
	fastify.register(import('./spotify.js'), { prefix: '/spotify' });
}
