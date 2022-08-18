import { CommonRoutesConfig } from './common.routes.config.js';
import express from 'express';
import path from 'node:path';

export class IndexRoutes extends CommonRoutesConfig {
	constructor(app: express.Application) {
		super(app, 'IndexRoutes');
	}

	configureRoutes() {
		this.app
			.route('/')
			.get(async function (req: express.Request, res: express.Response) {
				res.render('index', { title: 'Index' }, function (err, html) {
					if (err) return console.log('Render error: ', err);
					res.send(html);
				});
			});

		this.app
			.route('/favicon.ico')
			.get(async function (req: express.Request, res: express.Response) {
				res.sendFile(path.resolve('public/favicon.ico'));
			});

		return this.app;
	}
}
