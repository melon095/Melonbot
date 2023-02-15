import path, { resolve } from 'node:path';
import jwt from 'jsonwebtoken';
import fastify, { FastifyInstance } from 'fastify';
import { UserRole } from './../Typings/models/bot/users.js';

export type RouteConstructor = (app: FastifyInstance) => Promise<void> | void;

export interface FastifyAuthenticatedUser {
	/**
	 * The username of the user
	 */
	username: string;
	/**
	 * The internal id of the user
	 */
	id: number;
	/**
	 * The role of the user
	 */
	role: UserRole;
	/**
	 * The users twitch identifier
	 */
	identifier: string;
}

declare module 'fastify' {
	export interface FastifyRequest {
		authenticatedUser?: FastifyAuthenticatedUser;
	}
}

const SECRET = Buffer.from(Bot.Config.Website.JWTSecret);
const ISSUER = 'MELONBOT-OAUTH';

export interface JWTData {
	name: string;
	id: number;
	v: 1;
}

/**
 * Class that handles jwt authentication
 */
export const Authenticator = new (class {
	public readonly COOKIE_NAME = 'auth-token';

	async VerifyJWT(token: string): Promise<JWTData> {
		const result = (await new Promise((Resolve, Reject) => {
			jwt.verify(token, SECRET, { issuer: ISSUER }, (err, data) => {
				if (err) Reject(err);
				else Resolve(data as JWTData);
			});
		})) as JWTData;

		return result as JWTData;
	}

	async SignJWT(data: JWTData): Promise<string> {
		const result = (await new Promise((Resolve, Reject) => {
			jwt.sign(
				data,
				SECRET,
				{ issuer: ISSUER, algorithm: 'HS256', expiresIn: '7d' },
				(err, token) => {
					if (err) Reject(err);
					else Resolve(token as string);
				},
			);
		})) as string;

		return result;
	}

	DecryptJWT(token: string): JWTData | null {
		const result = jwt.decode(token, { json: true }) as JWTData;

		if (!result) return null;

		return result;
	}
})();

(async function () {
	const port = Bot.Config.Website.Port || 3000;

	const app = fastify({ pluginTimeout: 10000 });

	await app.register(import('@fastify/static'), {
		root: path.join(process.cwd(), 'web', 'dist', 'assets'),
		etag: !Bot.Config.Development,
		prefix: '/assets/',
	});

	await app.register(import('@fastify/cookie'));

	// if (!Bot.Config.Development) {
	// 	const publicUrl = Bot.Config.Website.WebUrl;
	// 	await app.register(import('@fastify/cors'), {
	// 		origin: publicUrl,
	// 		credentials: true,
	// 		allowedHeaders: ['Content-Type', 'Authorization'],
	// 		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	// 	});
	// }

	(await import('./Hooks/RequestLogger.js')).default(app);

	app.route({
		method: 'GET',
		url: '/robots.txt',
		handler: (_, res) => {
			res.type('text/plain');
			res.send('User-agent: *\nDisallow: /');
		},
	});

	await app.register(import('./routes/api/index.js'), { prefix: '/api' });
	await app.register(import('./routes/bot/index.js'), { prefix: '/bot' });

	app.route({
		method: 'GET',
		url: '*',
		handler: (_, res) => {
			res.sendFile('index.html', path.join(process.cwd(), 'web', 'dist'));
		},
	});

	await app.listen({ port, host: '0.0.0.0' });

	Bot.Log.Info('Listening... %d', port);
	const routes = app.printRoutes();
	console.log(routes);
})();
