export default (async function () {
	const Express = await import('express');
	const Router = Express.Router();
	/**
	 * @route GET /user/dashboard
	 * @requires token - The user's JWT
	 */
	Router.get('/dashboard', async function (req, res) {
		const { id, name } = res.locals.authUser;
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

	Router.get('/logout', async (req, res) => {
		const { id, name } = res.locals.authUser;
		await Bot.Redis.SDel(`session:${id}:${name}`);
		await Bot.Redis.SDel(`token:${id}:${name}`);

		res.clearCookie('token', { path: '/' }).redirect('/');
	});

	return Router;
})();
