import { NCommandFunctions } from './../../../tools/tools.js';
import { Database } from './../../../Typings/types.js';

export default (async function () {
	const Express = await import('express');
	const Router = Express.Router();

	Router.get('/', async (req, res) => {
		const commands = await Bot.SQL.Query<Database.commands[]>`SELECT * FROM commands`.then(
			(commands) => {
				if (!commands.length) {
					return null;
				}
				const all = [];
				for (const command of commands) {
					const rewrote = {
						id: command.id,
						name: command.name,
						description: command.description,
						perm: NCommandFunctions.DatabaseToMode(command.perm),
					};

					all.push(rewrote);
				}
				return all;
			},
		);
		if (commands === null) {
			res.render('error', { safeError: 'There are no commands' });
		} else {
			res.render('commands', { commands: commands, title: 'Commands' }, function (err, html) {
				if (err) return console.log('Render error: ', err);
				res.send(html);
			});
		}
	});

	Router.get('/:name', async (req, res) => {
		const name = req.params.name;
		const command = await Bot.Commands.get(name);
		if (!command) {
			return res.status(404).render('error', { safeError: 'That command does not exist' });
		}

		const prefix = Bot.Config.Prefix;

		res.send(await command.LongDescription(prefix));
	});

	return Router;
})();
