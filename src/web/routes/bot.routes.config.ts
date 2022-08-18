import express from 'express';
import { NCommandFunctions } from '../../tools/tools.js';
import { Database } from '../../Typings/types';
import { CommonRoutesConfig } from './common.routes.config.js';

const REDIRECT_TWITCH_URL = (Id: string, url: string) =>
	`https://id.twitch.tv/oauth2/authorize?` +
	`client_id=${Id}` +
	`&redirect_uri=${url + '/login/twitch/code'}` +
	`&response_type=code&scope=${encodeURIComponent(
		'user:read:email channel:manage:broadcast',
	)}`;

export class BotRoutes extends CommonRoutesConfig {
	constructor(app: express.Application) {
		super(app, 'BotRoutes');
	}

	configureRoutes() {
		// this.app
		// 	.route('/bot')
		// 	.get(async function (req: express.Request, res: express.Response) {
		// 		const date: Date = new Date();

		// 		try {
		// 			let stats: Database.stats[] | Database.stats;
		// 			const single =
		// 				req.query.channel === undefined ? false : true;
		// 			const year = req.query.year
		// 				? Number(date.getFullYear())
		// 				: Number(req.query.year);
		// 			let month = req.query.month
		// 				? Number(date.getMonth() + 1)
		// 				: Number(req.query.month);
		// 			const day = req.query.day
		// 				? Number(date.getDate())
		// 				: Number(req.query.day);
		// 			let dayStat;

		// 			// Probably good enough 4Head
		// 			if (month >= 13) {
		// 				month = 12;
		// 			}

		// 			if (month <= 0) {
		// 				month = 1;
		// 			}

		// 			if (!single) {
		// 				const all = (
		// 					await Bot.SQL.promisifyQuery<Database.stats>(
		// 						'SELECT * FROM stats',
		// 					)
		// 				).ArrayOrNull();
		// 				if (all === null) return res.status(500);
		// 				stats = all;
		// 			} else {
		// 				const channel = (
		// 					await Bot.SQL.promisifyQuery<Database.stats>(
		// 						'SELECT * FROM stats WHERE name = ?',
		// 						[req.query.channel],
		// 					)
		// 				).ArrayOrNull();
		// 				if (channel === null) return res.status(500);
		// 				stats = channel;
		// 				const statFiles = await ReadFolderStats();

		// 				for (const [fileName, file] of Object.entries(
		// 					statFiles,
		// 				)) {
		// 					const a: string[] = fileName.split('-');
		// 					if (
		// 						Number(a[0]) === year &&
		// 						Number(a[1]) === month &&
		// 						Number(a[2]) === day
		// 					) {
		// 						if (file.channel === req.query.channel) {
		// 							dayStat = file;
		// 							break;
		// 						}
		// 					}
		// 				}
		// 			}
		// 			console.time('TimeRender');

		// 			res.render(
		// 				'stats',
		// 				{
		// 					stats: stats,
		// 					title: 'Stats',
		// 					specific: single,
		// 					year: year,
		// 					month: Number(month),
		// 					day: Number(day),
		// 					dayStat: dayStat,
		// 				},
		// 				function (err: Error, html: string) {
		// 					if (err) return console.log('Render error: ', err);
		// 					res.send(html);
		// 					console.timeEnd('TimeRender');
		// 				},
		// 			);
		// 		} catch (error) {
		// 			console.log(error);
		// 			res.status(500);
		// 			return;
		// 		}
		// 	});

		this.app
			.route('/bot/login')
			.get(async function (req: express.Request, res: express.Response) {
				res.render(
					'login',
					{ title: 'Login', LoggedIn: req.query.loggedIn },
					function (err: Error, html: string) {
						if (err) return console.log('Render error: ', err);
						res.send(html);
					},
				);
			});

		this.app
			.route('/bot/login/redirect')
			.get((req, res) =>
				res.redirect(
					301,
					REDIRECT_TWITCH_URL(
						Bot.Config.Twitch.ClientID,
						Bot.Config.Website.WebUrl,
					),
				),
			);

		this.app
			.route('/bot/commands')
			.get(async function (req: express.Request, res: express.Response) {
				const commands =
					await Bot.SQL.promisifyQuery<Database.commands>(
						'SELECT * FROM commands',
					)
						.then((c) => c.ArrayOrNull())
						.then((commands) => {
							if (commands === null) {
								res.status(500);
								return null;
							}
							const all = [];
							for (const command of commands) {
								const rewrote = {
									id: command.id,
									name: command.name,
									description: command.description,
									perm: NCommandFunctions.DatabaseToMode(
										command.perm,
									),
								};

								all.push(rewrote);
							}
							return all;
						});
				if (commands === null) return;
				res.render(
					'commands',
					{ commands: commands, title: 'Commands' },
					function (err, html) {
						if (err) return console.log('Render error: ', err);
						res.send(html);
					},
				);
			});
		return this.app;
	}
}
