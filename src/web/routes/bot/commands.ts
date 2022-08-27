import { NCommandFunctions } from './../../../tools/tools.js';
import { Database } from './../../../Typings/types.js';

export default (async function () {
	const Express = await import('express');
	const Router = Express.Router();

	Router.get('/', async (req, res) => {
		const table = await Bot.SQL.Query<Database.commands[]>`SELECT * FROM commands`.then(
			(commands) => {
				if (!commands.length) {
					return null;
				}
				const all = [];
				for (const command of commands) {
					all.push({
						Name: `<a href="/bot/commands/${command.name}">${command.name}</a>`,
						Description: command.description,
						Permission: NCommandFunctions.DatabaseToMode(command.perm),
					});
				}
				return all;
			},
		);
		if (table === null) {
			res.render('error', { safeError: 'There are no commands' });
		} else {
			const head = ['Name', 'Description', 'Permission'];

			res.render('array-table', { table, head, title: 'All Commands' });
		}
	});

	Router.get('/:name', async (req, res) => {
		const Name = req.params.name;
		const Command = await Bot.Commands.get(Name);
		if (!Command) {
			return res.status(404).render('error', { safeError: 'That command does not exist' });
		}

		const prefix = Bot.Config.Prefix;

		const LongDescription =
			(await Command.LongDescription?.(prefix))?.join('\n') || 'No description';

		// The reason we have to replace pre code is because this parser decides
		// that there should be whitespace behind every line
		// can't have that, looks like shite.
		const LongDescriptionHTML = (await import('markdown-it'))
			.default({ breaks: true })
			.render(LongDescription)
			.replace('<pre><code>', '')
			.split('\n')
			.map((line: string) => line.trim())
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

		res.render('single-table', {
			table: Table,
			head: Header,
			title: `Command Description - ${Name}`,
		});

		// res.send(await command.LongDescription(prefix));
	});

	return Router;
})();
