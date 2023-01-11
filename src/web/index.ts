import path, { resolve } from 'node:path';
import cors from 'cors';
import * as tools from './../tools/tools.js';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';

const SECRET = Buffer.from(Bot.Config.Website.JWTSecret);
const ISSUER = 'MELONBOT-OAUTH';

export interface JWTData {
	name: string;
	id: string;
	v: 1;
}

/**
 * Class that handles jwt authentication
 */
export const Authenticator = new (class {
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

	/**
	 * Validates the JWT token.
	 * If it is valid and matches a user in the database
	 * it will return the user object.
	 * Will 302 to the main page if the token is invalid or the user doesn't exist.
	 */
	async Middleware(res: Response, token: string): Promise<boolean> {
		let data: JWTData;
		try {
			data = await this.VerifyJWT(token);
		} catch (e) {
			res.clearCookie('token', { path: '/' }).redirect('/');
			return false;
		}

		// Ask redis if the user exists
		const jwt_user = await Bot.Redis.SGet(`session:${data.id}:${data.name}`);
		if (!jwt_user) {
			res.clearCookie('token', { path: '/' }).redirect('/');
			return false;
		}

		res.locals.authUser = {
			name: data.name,
			id: data.id,
		};

		return true;
	}
})();

type HeaderItem = {
	name: string;
	url?: string;
	items?: {
		name: string;
		url: string;
	}[];
};

const header: HeaderItem[] = [
	{
		name: 'Home',
		url: '/',
	},
	{
		name: 'Bot',
		items: [{ name: 'Commands', url: '/bot/commands' }],
	},
];

const authedRoutes: HeaderItem[] = [
	{
		name: 'Dashboard',
		url: '/user/dashboard',
	},
	{
		name: 'Login to Spotify',
		url: '/auth/spotify/',
	},
	{
		name: 'Logout',
		url: '/user/logout',
	},
];

(async function () {
	const middlewares = ['logger'];

	const subroutes = ['api', 'auth', 'bot', 'user'];

	const Express = await import('express');
	const CookieParser = await import('cookie-parser');

	const dirname = tools.getDirname(import.meta.url);
	const Dirs = {
		Public: resolve(process.cwd(), 'web', 'public'),
		Views: resolve(process.cwd(), 'web', 'views'),
	};

	const port = Bot.Config.Website.Port || 3000;

	const app = Express.default();

	app.use(CookieParser.default());
	app.use(cors());
	app.use(Express.json());
	app.set('views', Dirs.Views);
	app.set('view engine', 'pug');
	app.locals.basedir = Dirs.Public;

	if (Bot.Config.Development) {
		app.use(
			Express.static(Dirs.Public, {
				etag: false,
			}),
		);
	} else {
		app.use(
			Express.static(Dirs.Public, {
				etag: true,
				maxAge: '1 day',
				lastModified: true,
			}),
		);
	}

	app.locals.headeritems = header;
	app.locals.authedRoutes = authedRoutes;

	app.get('/robots.txt', (_, res) => {
		// No, i don't think so.
		res.type('text/plain');
		res.send('User-agent: *\nDisallow: /');
	});

	const username = Bot.Config.BotUsername;

	// Log web request
	app.all('*', async (req, res, next) => {
		const data: WebRequestLog = {
			endpoint: req.baseUrl + req.url,
			method: req.method,
			request_ip: `${req.header('X-Forwarded-For')} (${req.socket.remoteAddress})`,
			headers: JSON.stringify(req.headers) || null,
			body: JSON.stringify(req.body) || null,
			query: JSON.stringify(req.query) || null,
		};

		Bot.SQL.Query`
            INSERT INTO logs.web_request ${Bot.SQL.Get(data)}
        `.execute();

		const authCookie = req.cookies['token'];
		if (authCookie) {
			const okay = await Authenticator.Middleware(res, authCookie);
			if (!okay) return;
		}

		const isAuthed = isAuthedPath(authedRoutes, req.url);

		if (isAuthed && !res.locals.authUser) {
			res.redirect('/');
			return;
		}

		next();
	});

	app.get('/', (req, res) => {
		res.render('index', { title: 'Index', bot: { name: username } });
	});

	for (const middleware of middlewares) {
		app.use(await tools.Import(dirname, `middlewares/${middleware}.js`));
	}

	for (const route of subroutes) {
		app.use(`/${route}`, await tools.Import(dirname, `routes/${route}/index.js`));
	}

	app.get('*', (req, res) => res.status(404).render('404'));

	app.listen(port, () => console.info('Listening...', { port }));
})();

type WebRequestLog = {
	method: string;
	endpoint: string;
	request_ip: string;
	headers: string | null;
	query: string | null;
	body: string | null;
};

const isAuthedPath = (routes: HeaderItem[], path: string): boolean =>
	routes.some((item) => {
		if (item.url === path) return true;
		if (item.items) return isAuthedPath(item.items, path);
		return false;
	});
