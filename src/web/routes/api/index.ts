import { FastifyInstance } from 'fastify';
import AuthenticationValidator from '../../Hooks/AuthenticationValidator.js';

export default async function (fastify: FastifyInstance) {
	await fastify.register(import('./v1/index.js'), { prefix: '/v1' });
	await fastify.register(import('./auth/index.js'), { prefix: '/auth' });

	fastify.route({
		method: 'GET',
		url: '/me',
		preParsing: AuthenticationValidator('JSON'),
		handler: async (req, reply) => {
			Bot.Log.Info('%o', req.authenticatedUser);

			return {
				asd: true,
			};
		},
	});
}
