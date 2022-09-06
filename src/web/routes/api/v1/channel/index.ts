type Settings = {
	[key: string]: boolean;
};

export default (async function () {
	const Express = await import('express');
	const Router = Express.Router();
	const { Import } = await import('./../../../../../tools/tools.js');
	const { getDirname } = await import('./../../../../../tools/tools.js');
	const { Authenticator } = await import('../../../../../web/index.js');

	const subroutes = [['banphrase', 'banphrase/index.js']];

	for (const [route, file] of subroutes) {
		Router.use(`/${route}`, await Import(getDirname(import.meta.url), file));
	}

	Router.post('/settings', async (req, res) => {
		const cookie = req.cookies['token'];
		const jwt = Authenticator.DecryptJWT(cookie);

		if (!jwt) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const user = await Bot.User.Get(jwt.id, jwt.name, { throwOnNotFound: false });
		if (!user) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const body = req.body as Settings;

		const currentSettings = await user.GetSettings();

		const newSettings = {
			...currentSettings,
			...body,
		};

		const settings = { ...currentSettings, ...newSettings };

		await user.SetSettings(settings);

		await Bot.Redis.Publish('user-update', 'settings', {
			id: user.TwitchUID,
		});

		res.status(200).json({ status: 'ACK' });
	});

	return Router;
})();
