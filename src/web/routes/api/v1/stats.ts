import shell from 'node:child_process';
import process from 'node:process';
import * as tools from '../../../../tools/tools.js';

type sum = { sum: number }[];

export default (async function () {
	const Express = await import('express');
	const Router = Express.Router();

	Router.get('/', async (req, res) => {
		const [ch] = await Bot.SQL.Query<sum>`SELECT SUM(commands_handled) AS sum FROM stats`;

		if (!ch) return res.status(404).json({ error: 'Not found' });

		const stats = {
			commitHash: shell
				.execSync(`cd ${process.cwd()} && git rev-parse --short HEAD`)
				.toString()
				.replace('\n', ''),
			commits: Number(
				shell.execSync(`cd ${process.cwd()} && git rev-list --all --count`).toString(),
			),
			uptime: tools.humanizeDuration(process.uptime()),
			commandsHandled: Number(ch.sum),
		};
		res.json(stats);
	});

	return Router;
})();
