// type OnSaveFunc = (event: Event) => Promise<void>;
// type OnEnableFunc = () => Promise<{}>;

// /**
//  * An event that is shown on the website
//  * OnSave is fired when an event is saved on the client
//  * The OnSave function should send a post request to the server
//  * To /api/user/event/:name
//  */
// interface UserSettings {
// 	Name: string;
// 	Description: string;
// 	OnEnable: OnEnableFunc;
// 	OnSave: OnSaveFunc;
// }

// const Settings: readonly UserSettings[] = [
// 	{
// 		Name: 'Banphrases',
// 		Description:
// 			'Banphrases is a list of regex patterns that will be matched against all messages. If a match is found, the bot wont respond. Pb1 (Pajbot1) is also supported.',
// 		OnSave: async (event: Event) => {},
// 	},
// ];

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
			},
			banphrases,
		});
	});

	return Router;
})();
