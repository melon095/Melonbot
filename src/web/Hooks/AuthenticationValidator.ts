import { ResolveInternalID } from './../../controller/User/index.js';
import { FastifyRequest, FastifyInstance } from 'fastify';
import { JWTData, Authenticator } from './../index.js';

// Validates a authenticated route, injecting the authenticatedUser object into the request
export default function (fastify: FastifyInstance, failureMethod: 'REDIRECT' | 'JSON') {
	function getJWTToken(req: FastifyRequest) {
		const cookie = req.cookies[Authenticator.COOKIE_NAME];

		if (cookie) return cookie;

		const authHeader = req.headers.authorization;

		if (authHeader) {
			const [type, token] = authHeader.split(' ');

			if (type === 'Bearer') return token;
			return null;
		}

		return null;
	}

	async function ValidateAuthToken(request: FastifyRequest, token: string): Promise<boolean> {
		let data: JWTData;
		try {
			data = await Authenticator.VerifyJWT(token);
		} catch {
			return false;
		}

		// Ask redis if the user exists
		const jwt_user = await Bot.Redis.SGet(`session:${data.id}:${data.name}`);
		if (!jwt_user) {
			return false;
		}

		const internalUser = await ResolveInternalID(data.id);

		if (!internalUser) {
			return false;
		}

		request.authenticatedUser = {
			id: internalUser.ID,
			role: internalUser.Role,
			identifier: internalUser.TwitchUID,
			username: internalUser.Name,
		};

		return true;
	}

	let failureHandler: (req: FastifyRequest, reply: any) => void;

	switch (failureMethod) {
		case 'REDIRECT': {
			failureHandler = (req, reply) => {
				reply.clearCookie(Authenticator.COOKIE_NAME, { path: '/' });
				reply.redirect('/');
			};
			break;
		}

		case 'JSON': {
			failureHandler = (req, reply) => {
				reply.clearCookie(Authenticator.COOKIE_NAME, { path: '/' });
				reply.send({
					status: 401,
					message: 'Unauthorized',
				});
			};
			break;
		}

		default: {
			throw new Error('Invalid failure method');
		}
	}

	fastify.addHook('preParsing', async (req, reply) => {
		const token = getJWTToken(req);

		if (!token) {
			failureHandler(req, reply);

			return reply;
		}

		const isValid = await ValidateAuthToken(req, token);

		if (!isValid) {
			failureHandler(req, reply);

			return reply;
		}

		return reply;
	});
}
