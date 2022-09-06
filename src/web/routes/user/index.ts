export default (async function () {
	const Express = await import('express');
	const Router = Express.Router();
	/**
	 * @route GET /user/dashboard
	 * @requires token - The user's JWT
	 */
	Router.get('/dashboard', async function (req, res) {
		const { id, name } = res.locals.user;
		const user = await Bot.User.Get(id, name);
		const banphrases = await Bot.SQL.Query<Database.banphrases[]>`
            SELECT * FROM banphrases
            WHERE channel = ${user.TwitchUID}
        `;
		const profilePicture = await user.GetProfilePicture();

		res.render('user/dashboard', {
			user: {
				...user,
				profilePicture,
				Options: await user.GetSettings(),
			},
			banphrases,
		});
	});

	return Router;
})();
