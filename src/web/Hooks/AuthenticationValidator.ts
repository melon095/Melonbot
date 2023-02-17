import { ResolveInternalID } from './../../controller/User/index.js';
import { FastifyRequest, FastifyInstance, FastifyReply } from 'fastify';
import { JWTData, Authenticator } from './../index.js';

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

// Validates a authenticated route, injecting the authenticatedUser object into the request
// Should be used with preParsing, to allow injection of the user object
// Continue on failure will allow the route to continue if the user is not authenticated (useful for public routes) where you optionally want user data.
export default function (failureMethod: 'REDIRECT' | 'JSON', continueOnFailure = false) {
	let failureHandler: (req: FastifyRequest, reply: FastifyReply) => void;

	switch (failureMethod) {
		case 'REDIRECT': {
			failureHandler = (req, reply) => {
				// prettier-ignore
				reply
                    .redirect('/');
			};
			break;
		}

		case 'JSON': {
			failureHandler = (req, reply) => {
				// prettier-ignore
				reply
                    .status(401)
                    .send({
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

	return async function (req: FastifyRequest, reply: FastifyReply) {
		const token = getJWTToken(req);

		if (!token) {
			if (continueOnFailure) return;

			failureHandler(req, reply);

			return reply;
		}

		const isValid = await ValidateAuthToken(req, token);

		if (!isValid) {
			if (continueOnFailure) return;

			failureHandler(req, reply);

			return reply;
		}
	};
}
