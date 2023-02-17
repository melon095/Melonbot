import { FastifyInstance } from 'fastify';
import { Authenticator } from './../../../index.js';

export default async function (fastify: FastifyInstance) {
	fastify.register(import('./twitch.js'), { prefix: '/twitch' });
	fastify.register(import('./spotify.js'), { prefix: '/spotify' });

	fastify.route({
		method: 'GET',
		url: '/logout',
		handler: async (req, reply) => {
			reply.clearCookie(Authenticator.COOKIE_NAME);
			reply.redirect('/');
		},
	});
}
