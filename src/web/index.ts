import path, { resolve } from 'node:path';
import cors from 'cors';
import * as tools from './../tools/tools.js';

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

	app.get('/robots.txt', (_, res) => {
		// No, i don't think so.
		res.type('text/plain');
		res.send('User-agent: *\nDisallow: /');
	});

	app.get('/', (_, res) => {
		res.render('index', { title: 'Index' });
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
