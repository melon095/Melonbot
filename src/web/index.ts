import path, { join } from 'node:path';
import cors from 'cors';
import * as tools from './../tools/tools.js';

export const Import = async (folder: string, route: string) =>
	await (
		await import(join('file://', folder, route))
	).default;

(async function () {
	const error = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width='device-width', initial-scale=1.0">
        <title>Nothing here, move along!</title>
        <style>
            html, body {
                height: 100%;
            }
    
            html {
                display: table;
                margin: auto;
            }
    
            body {
                vertical-align: middle;    
            }
            
            #bigFourOFour {
                font-size: xx-large;
            }
            
        </style>
    </head>
    <body>
        <img src="https://cdn.7tv.app/emote/60e5d610a69fc8d27f2737b7/4x">
        <div class="underImage">
            <p><span id="bigFourOFour">404</span> Page <b><span id="url"></span></b> not found...</p>
        </div>        
        
        <script type="text/javascript">
            document.getElementById("url").innerHTML = document.location.pathname;
        </script>
    </body>
    </html>`;

	const middlewares = ['logger'];

	const subroutes = ['api', 'bot', 'login'];

	const Express = await import('express');

	const dirname = tools.getDirname(import.meta.url);

	const port = Bot.Config.Website.Port || 3000;

	const app = Express.default();

	app.use(cors());
	app.use(Express.json());
	app.set('views', path.resolve(dirname, 'views'));
	app.set('view engine', 'pug');
	app.locals.basedir = path.resolve(dirname);

	app.use(
		'/public',
		Express.static(`${dirname}/public`, {
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
		app.use(await Import(dirname, `middlewares/${middleware}.js`));
	}

	for (const route of subroutes) {
		app.use(`/${route}`, await Import(dirname, `routes/${route}/index.js`));
	}

	app.get('*', (req, res) => res.status(404).send(error));

	app.listen(port, () => console.info('Listening...'));
})();
