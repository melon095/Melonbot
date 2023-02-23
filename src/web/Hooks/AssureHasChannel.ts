import { FastifyReply, FastifyRequest } from 'fastify';

export default async function (req: FastifyRequest, reply: FastifyReply) {
	const user = req.authenticatedUser;

	if (!user) {
		reply.redirect('/');

		return reply;
	}

	const has_channel = await Bot.SQL.Query`
        SELECT name FROM channels where user_id = ${user.identifier} LIMIT 1
    `;

	if (!has_channel.length) {
		reply.redirect('/');

		return reply;
	}
}
