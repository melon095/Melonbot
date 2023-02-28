import { FastifyReply, FastifyRequest } from 'fastify';

export default async function (req: FastifyRequest, reply: FastifyReply) {
	const user = req.authenticatedUser;

	if (!user) {
		reply.redirect('/');

		return reply;
	}

	const has_channel = await Bot.SQL.selectFrom('channels')
		.where('user_id', '=', user.identifier)
		.executeTakeFirst();

	if (!has_channel) {
		reply.redirect('/');

		return reply;
	}
}
