import Got from '../../../tools/Got.js';
import type { Helix } from './../../../Typings/types.js';
import { Authenticator } from './../../../web/index.js';

const redirect_uri = Bot.Config.Website.WebUrl + '/auth/twitch/callback';

const TWITCH_USER_TOKEN = (code: string) => {
	const params = new URLSearchParams({
		client_id: Bot.Config.Twitch.ClientID,
		client_secret: Bot.Config.Twitch.ClientSecret,
		code,
		grant_type: 'authorization_code',
		redirect_uri,
	});

	return 'https://id.twitch.tv/oauth2/token?' + params.toString();
};

const SCOPE = encodeURIComponent(['user:read:email', 'channel:manage:broadcast'].join(' '));
const CALLBACK_PARAMS = new URLSearchParams({
	response_type: 'code',
	client_id: Bot.Config.Twitch.ClientID,
	redirect_uri,
	scope: SCOPE,
});
const TWITCH_CALLBACK = `https://id.twitch.tv/oauth2/authorize?` + CALLBACK_PARAMS.toString();

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

	/**
	 * Redirect the user to Twitch's OAuth page
	 */
	Router.get('/', async function (req, res) {
		res.redirect(TWITCH_CALLBACK);
		return;
	});

	/**
	 * Called when a uses har logged in to Twitch
	 * And gets redirected back to the website
	 */
	Router.get('/callback', async function (req, res) {
		try {
			const { code, error, error_description } = req.query as {
				code?: string;
				error?: string;
				error_description?: string;
			};

			if (error) {
				Bot.HandleErrors('Twitch OAuth Error', { error, error_description });
				res.render('error', {
					safeError: 'There was an error logging you in try again later.',
				});
				return;
			}

			if (!code) {
				res.render('error', {
					safeError: 'There was an error logging you in try again later.',
				});
				return;
			}

			// Second step of the OAuth process
			const second_url = TWITCH_USER_TOKEN(code);

			const json = (await Got('json').post(second_url).json()) as TwitchOAuthRes;

			const { access_token, refresh_token, expires_in } = json;

			// Fetch the user from Helix
			// If we use the access token created by the user, we get their data.
			const { body: user_body, statusCode: user_statusCode } = await Got('json').get(
				'https://api.twitch.tv/helix/users',
				{
					headers: {
						'Client-ID': Bot.Config.Twitch.ClientID,
						Authorization: `Bearer ${access_token}`,
					},
				},
			);

			const user_json = JSON.parse(user_body) as Helix.Users;

			if (user_statusCode !== 200 || !user_json.data || user_json.data.length === 0) {
				Bot.HandleErrors('Twitch OAuth', user_json);

				res.render('error', {
					safeError: 'There was an error logging you in try again later.',
				});
				return;
			}

			const user = await Bot.User.Get(user_json.data[0].id, user_json.data[0].login, {
				throwOnNotFound: false,
			});

			if (!user) {
				res.render('error', {
					safeError:
						'I have never seen you before, please say something in chat to get started.',
				});
				return;
			}

			// Save the user's access token and generate a JWT Token
			const jwt = await user.SetToken(
				{ access_token, refresh_token, expires_in },
				Authenticator.SignJWT,
			);

			const cookieOptions = {
				// 7 days
				maxAge: 1000 * 60 * 60 * 24 * 7,
				httpOnly: true,
				path: '/',
			};

			res.cookie('token', jwt, cookieOptions);
			res.redirect('/');
		} catch (error) {
			Bot.HandleErrors('Twitch OAuth', error);

			res.render('error', {
				safeError: 'There was an error logging you in try again later.',
			});
		}
	});

	return Router;
})();
