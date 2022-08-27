import { NCommandFunctions } from './../../../tools/tools.js';
import { Database } from './../../../Typings/types.js';
import MarkdownIt from 'markdown-it';

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
		const Name = req.params.name;
		const Command = await Bot.Commands.get(Name);
		if (!Command) {
			return res.status(404).render('error', { safeError: 'That command does not exist' });
		}

		const prefix = Bot.Config.Prefix;

		const LongDescription = (await Command.LongDescription?.(prefix)) || 'No description';

		// The reason we have to replace pre code is because this parser decides
		// that there should be whitespace behind every line
		// can't have that, looks like shite.
		const LongDescriptionHTML = new MarkdownIt({ breaks: true })
			.render(LongDescription)
			.replace('<pre><code>', '')
			.split('\n')
			.map((line) => line.trim())
			.join('\n')
			.replace(/^/, '<pre><code>');

		const Alias = Command.Aliases.length ? Command.Aliases.join(', ') : 'None';

		const Table = {
			Name: Command.Name,
			Aliases: Alias,
			Description: Command.Description,
			Cooldown: `${Command.Cooldown} Seconds`,
			Permission: NCommandFunctions.DatabaseToMode(Command.Permission),
			'Long Description': LongDescriptionHTML,
		};

		const Header = `${prefix} ${Command.Name}`;

		res.render('table', {
			table: Table,
			head: Header,
			title: `Command Description - ${Name}`,
		});

		// res.send(await command.LongDescription(prefix));
	});

	return Router;
})();
