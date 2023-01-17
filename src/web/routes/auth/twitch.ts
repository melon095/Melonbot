import type { Helix } from './../../../Typings/types.js';
import { Authenticator } from './../../../web/index.js';
import { GetSafeError } from './../../../controller/User/index.js';
import HelixAPI from './../../../Helix/index.js';
import { AuthenticationMethod, CookieOpts } from './../../oauth.js';
import { Err, Ok, Result } from './../../../tools/result.js';

export default (async function () {
	const RedirectURI = Bot.Config.Website.WebUrl + '/auth/twitch/callback';

	const Express = await import('express');
	const Router = Express.Router();

	const StrategyConstructor = (await import('./../../oauth.js')).default;

	const Strategy = new StrategyConstructor<Helix.User>(
		{
			name: 'Twitch',
			redirectURL: RedirectURI,
			authenticationMethod: AuthenticationMethod.Query,
			clientID: Bot.Config.Twitch.ClientID,
			clientSecret: Bot.Config.Twitch.ClientSecret,
			tokenURL: 'https://id.twitch.tv/oauth2/token',
		},
		async (access_token, refresh_token, expires_in, profile) => {
			if (!profile) {
				return new Err('No profile');
			}

			if (profile.err) {
				Bot.Log.Error(profile.inner, 'Twitch Profile Error');
				return new Err('There was an error logging you in try again later.');
			}

			const { id, login } = profile.inner;

			let user;
			try {
				user = await Bot.User.Get(id, login, { throwOnNotFound: true });
			} catch (error) {
				if (error instanceof GetSafeError) {
					return new Err(
						'I have never seen you before, please say something in chat to get started.',
					);
				} else {
					return new Err('There was an error logging you in try again later.');
				}
			}

			const jwt = await user.SetToken(
				{ access_token, refresh_token, expires_in },
				Authenticator.SignJWT,
			);

			const cookie: CookieOpts = {
				name: 'token',
				value: jwt,
				httpOnly: true,
				path: '/',
			};

			return new Ok({ cookie });
		},
		async (accessToken) => {
			// TODO: Forced to use a Raw request, rather than Users due to Users method only working if the array is not empty.
			const user = await HelixAPI.Raw<Helix.Users>()(
				'GET',
				'users',
				{},
				{
					CustomHeaders: { Authorization: `Bearer ${accessToken}` },
				},
			);

			if (user.err) {
				Bot.Log.Error(user.inner, 'Twitch User Error');
				return new Err(new Error('There was an error logging you in try again later.'));
			}

			return new Ok(user.inner.data[0]);
		},
	);

	Router.get('/', (req, res) => {
		const Params = new URLSearchParams({
			response_type: 'code',
			client_id: Bot.Config.Twitch.ClientID,
			redirect_uri: RedirectURI,
			scope: '',
		});
		res.redirect(`https://id.twitch.tv/oauth2/authorize?${Params.toString()}`);
	});

	Router.get(
		'/callback',
		(req, res, next) => Strategy.authenticate(req, res, next),
		(_, res) => {
			res.redirect('/');
		},
	);

	return Router;
})();
