export default (async function () {
	const Express = await import('express');
	const Router = Express.Router();

	/**
	 * @route GET /user/dashboard
	 * @requires token - The user's JWT
	 */
	Router.get('/dashboard', async function (req, res) {
		res.send('hi :D');
	});

	return Router;
})();
