import { CommonRoutesConfig } from '../common.routes.config.js';
import express from 'express';
import shell from 'node:child_process';
import process from 'node:process';
import * as tools from '../../../tools/tools.js';

type sum = { sum: number };

export class StatsRoutes extends CommonRoutesConfig {
	constructor(app: express.Application) {
		super(app, 'StatsRoutes');
	}

	configureRoutes() {
		this.app
			.route('/v1/stats')
			.get(async function (req: express.Request, res: express.Response) {
				const ch = (
					await Bot.SQL.promisifyQuery<sum>(
						'SELECT SUM(commands_handled) AS sum FROM stats',
					)
				).SingleOrNull();
				if (ch === null) return res.status(500);

				const stats = {
					commitHash: shell
						.execSync(
							`cd ${process.cwd()} && git rev-parse --short HEAD`,
						)
						.toString()
						.replace('\n', ''),
					commits: Number(
						shell
							.execSync(
								`cd ${process.cwd()} && git rev-list --all --count`,
							)
							.toString(),
					),
					uptime: tools.humanizeDuration(process.uptime()),
					commandsHandled: Number(ch.sum),
				};
				res.json(stats);
			});

		return this.app;
	}
}
