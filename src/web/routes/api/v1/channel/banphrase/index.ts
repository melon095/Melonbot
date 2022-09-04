export default (async function () {
	const Express = await import('express');
	const Router = Express.Router();
	const { Authenticator } = await import('./../../../../../index.js');

	Router.delete('/:id', async (req, res) => {
		const { id } = req.params as { id: string };

		const cookie = req.cookies['token'];
		if (!cookie) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const jwt = await Authenticator.DecryptJWT(cookie);

		if (!jwt) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const user = await Bot.User.Get(jwt.id, jwt.name, { throwOnNotFound: false });
		if (!user) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const banphrase = await Bot.SQL.Query<Database.banphrases[]>`
            SELECT * FROM banphrases
            WHERE id = ${parseInt(id)}
        `;

		if (banphrase.length === 0) {
			res.status(404).json({ error: 'Banphrase not found' });
			return;
		}

		if (banphrase[0].channel !== user.TwitchUID) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const status = await user.RemoveBanphrase(banphrase[0].id);

		res.status(200).json({ id, status });
	});

	return Router;
})();
