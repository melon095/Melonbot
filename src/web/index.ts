import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { CommonRoutesConfig } from './routes/common.routes.config.js';
import { BotRoutes } from './routes/bot.routes.config.js';
import { IndexRoutes } from './routes/index.routes.config.js';
import { TwitchRoutes } from './routes/authentication/twitch.routes.config.js';
import { StatsRoutes } from './routes/api/stats.routes.config.js';

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

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default class App {
	private readonly app: express.Application;
	private readonly router: express.Router;
	private readonly port = Bot.Config.Website.Port;
	private routes: Array<CommonRoutesConfig> = [];
	constructor() {
		this.app = express();
		this.router = express.Router();

		this.app.use('/', this.router);

		this.app.locals.basedir = path.resolve(dirname);

		this.app.use(cors());

		this.app.use(express.json());

		this.app.set('views', path.resolve(dirname, 'views'));
		this.app.set('view engine', 'pug');

		this.app.use(function logger(
			req: express.Request,
			res: express.Response,
			next: express.NextFunction,
		) {
			console.log(req.url);
			next();
		});

		//////////////////// Website ////////////////////

		this.routes.push(new IndexRoutes(this.app));
		this.routes.push(new BotRoutes(this.app));

		//////////////////// API ////////////////////

		this.routes.push(new StatsRoutes(this.app));

		//////////////////// LOGIN ////////////////////

		this.routes.push(new TwitchRoutes(this.app));

		//////////////////// MISC ////////////////////

		this.app.get(
			'*',
			async function (req: express.Request, res: express.Response) {
				res.send(error);
			},
		);
	}

	Listen() {
		this.app.listen(this.port, () => {
			for (const route of this.routes) {
				console.log(`Routes configured for ${route.getName()}`);
			}
			console.log(`App listening on port ${this.port}`);
		});
	}
}
