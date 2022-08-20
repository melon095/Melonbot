import { Database } from '../../../Typings/types.js';
import Got from '../../../tools/Got.js';

const TWITCH_USER_TOKEN = (code: string) =>
	`https://id.twitch.tv/oauth2/token` +
	`?client_id=${Bot.Config.Twitch.ClientID}` +
	`&client_secret=${Bot.Config.Twitch.ClientSecret}` +
	`&code=${code}` +
	`&grant_type=authorization_code` +
	`&redirect_uri=${Bot.Config.Website.WebUrl + '/login/twitch/code'}`;

interface TwitchOAuthRes {
	access_token: string;
	/** In seconds */
	expires_in: number;
	refresh_token: string;
	scope: string[];
	token_type: 'bearer';
}

export default (async function () {
	const Express = await import('express');
	const Router = Express.Router();

	// TODO refactor
	Router.get('/code', async function (req, res) {
		let logger = '';
		const code = req.query.code as string;

		if (!code) {
			return res.redirect('/login?loggedIn=false');
		}

		// Ask twitch to authenticate our code and get the actual token we can use, with refresh token
		try {
			if (typeof req.query.error !== 'undefined') {
				logger += ` ${req.path} - ${req.query.error}`;
				return res.status(500).json({ error: '500' });
			}

			const authorize: TwitchOAuthRes = await Got.post(
				TWITCH_USER_TOKEN(code),
			).json();

			// Get some more info about the user, like user id and login name.
			const user: any = await Got.get(
				'https://api.twitch.tv/helix/users',
				{
					headers: {
						Authorization: `Bearer ${authorize.access_token}`,
						'Client-Id': Bot.Config.Twitch.ClientID,
					},
				},
			).json();

			const userInfo = {
				id: user.data[0].id,
				access_token: authorize.access_token,
				login_name: user.data[0].login,
				refresh_token: authorize.refresh_token,
				scope: authorize.scope.join(' '),
				expires: authorize.expires_in,
			};

			const token = (
				await Bot.SQL.promisifyQuery<Database.tokens>(
					'SELECT * FROM tokens WHERE id = ?',
					[userInfo.id],
				)
			).SingleOrNull();

			if (token !== null) {
				// Delete old token if the user decides to login again.
				Bot.SQL.query('DELETE FROM tokens WHERE id = ?;', [
					userInfo.id,
				]);
			}

			Bot.SQL.query(
				`INSERT INTO tokens 
                    (id, access_token, name, refresh_token, scope, expires_in)
                VALUES (?,?,?,?,?,?);`,
				[
					userInfo.id,
					userInfo.access_token,
					userInfo.login_name,
					userInfo.refresh_token,
					userInfo.scope,
					userInfo.expires,
				],
			);

			(logger += `User_id: ${userInfo.id} - ${userInfo.login_name} added to database`),
				res.redirect(302, `/login?loggedIn=true`);
			res.end();
			return;
		} catch (error) {
			Bot.HandleErrors(
				'Web/Twitch/Login',
				new Error(JSON.stringify(error)),
			);
			res.status(500).json({ error: '500' });
			res.end();
			return;
		}
	});

	return Router;
})();
