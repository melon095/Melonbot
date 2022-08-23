export default (async function () {
	const Express = await import('express');
	const { Import } = await import('./../../../tools/tools.js');
	const { getDirname } = await import('./../../../tools/tools.js');

	const Router = Express.Router();
	const subroutes = [['v1', 'v1/index.js']];

	for (const [route, file] of subroutes) {
		Router.use(`/${route}`, await Import(getDirname(import.meta.url), file));
	}

	return Router;
})();
