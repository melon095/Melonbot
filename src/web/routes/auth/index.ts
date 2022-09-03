const REDIRECT_TWITCH_URL = (Id: string, url: string) =>
	`https://id.twitch.tv/oauth2/authorize?` +
	`client_id=${Id}` +
	`&redirect_uri=${url + '/login/twitch/code'}` +
	`&response_type=code&scope=${encodeURIComponent('user:read:email channel:manage:broadcast')}`;

export default (async function () {
	const Express = await import('express');
	const Router = Express.Router();
	const { Import } = await import('./../../../tools/tools.js');
	const { getDirname } = await import('../../../tools/tools.js');

	const subroutes = [['twitch', 'twitch.js']];

	for (const [route, file] of subroutes) {
		Router.use(`/${route}`, await Import(getDirname(import.meta.url), file));
	}

	return Router;
})();
