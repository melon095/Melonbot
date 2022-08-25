import { NCommandFunctions } from './../../../tools/tools.js';
import { Database } from './../../../Typings/types.js';

export default (async function () {
	const Express = await import('express');
	const Router = Express.Router();

	Router.get('/', async (req, res) => {
		res.render('error', { safeError: 'Nothing here yet' });
	});

	return Router;
})();
