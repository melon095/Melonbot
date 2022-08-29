import path, { resolve } from 'node:path';
import cors from 'cors';
import * as tools from './../tools/tools.js';

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
		url: '',
	},
	{
		name: 'Bot',
		items: [
			{ name: 'Commands', url: 'bot/commands' },
			// { name: 'Channels', url: 'bot/channels' },
			// { name: 'Suggestions', url: 'bot/suggestions' },
		],
	},
];

(async function () {
	const middlewares = ['logger'];

	const subroutes = ['api', 'bot', 'login'];

	const Express = await import('express');

	const dirname = tools.getDirname(import.meta.url);
	const Dirs = {
		Public: resolve(process.cwd(), 'web', 'public'),
		Views: resolve(process.cwd(), 'web', 'views'),
	};

	const port = Bot.Config.Website.Port || 3000;

	const app = Express.default();

	app.use(cors());
	app.use(Express.json());
	app.set('views', Dirs.Views);
	app.set('view engine', 'pug');
	app.locals.basedir = Dirs.Public;

	app.use(
		Express.static(Dirs.Public, {
			etag: true,
			maxAge: '1 day',
			lastModified: true,
		}),
	);

	app.locals.headeritems = header;

	app.get('/robots.txt', (_, res) => {
		// No, i don't think so.
		res.type('text/plain');
		res.send('User-agent: *\nDisallow: /');
	});

	const username = Bot.Config.BotUsername;

	app.get('/', (_, res) => {
		res.render('index', { title: 'Index', bot: { name: username } });
	});

	// Log web request
	app.all('*', async (req, _res, next) => {
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

		next();
	});

	for (const middleware of middlewares) {
		app.use(await tools.Import(dirname, `middlewares/${middleware}.js`));
	}

	for (const route of subroutes) {
		app.use(`/${route}`, await tools.Import(dirname, `routes/${route}/index.js`));
	}

	app.get('*', (req, res) => res.status(404).render('404'));

	app.listen(port, () => console.info('Listening...'));
})();

type WebRequestLog = {
	method: string;
	endpoint: string;
	request_ip: string;
	headers: string | null;
	query: string | null;
	body: string | null;
};
