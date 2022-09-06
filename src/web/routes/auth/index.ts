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
