import { AuthenticationMethod } from './../../oauth.js';
import Got from './../../../tools/Got.js';
import User from './../../../controller/User/index.js';
import { SpotifyTypes } from './../../../Typings/types.js';
import { SpotifyGetValidToken, SpotifyGot } from './../../../tools/spotify.js';

export default (async function () {
	const RedirectURI = Bot.Config.Website.WebUrl + '/auth/spotify/callback';

	const Express = await import('express');
	const Router = Express.Router();

	const { ClientID, ClientSecret } = Bot.Config.Spotify;
	const Authorization = 'Basic ' + Buffer.from(`${ClientID}:${ClientSecret}`).toString('base64');

	const StrategyConstructor = (await import('./../../oauth.js')).default;

	const Strategy = new StrategyConstructor(
		{
			name: 'Spotify',
			redirectURL: RedirectURI,
			authenticationMethod: AuthenticationMethod.Header,
			headers: {
				Authorization,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			tokenURL: 'https://accounts.spotify.com/api/token',
		},
		async (access_token, refresh_token, expires_in, profile, authUser, done) => {
			if (!profile || !authUser) {
				done(
					new Error(
						"You can't login because this application is not verified by Spotify. ;)",
					),
				);
				return;
			}

			const user = await Bot.User.Get(authUser?.id, authUser?.name, {
				throwOnNotFound: false,
			});

			if (!user) {
				done('Never seen you before, try talking in chat.');
				return;
			}

			const unix_expires_in = Date.now() + expires_in * 1000;
			await user.Set('spotify', {
				access_token,
				refresh_token,
				expires_in: unix_expires_in,
			});

			done(null);
		},
		async (accessToken, authUser) => {
			if (!authUser) {
				throw 'Please login to Twitch first';
			}

			// TODO: Maybe remove this, we don't use it.
			const { statusCode, body } = await SpotifyGot.get('me', {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			if (statusCode !== 200) {
				return null;
			}

			return JSON.parse(body) as SpotifyTypes.Me;
		},
	);

	Router.get('/', (req, res) => {
		const Params = new URLSearchParams({
			response_type: 'code',
			client_id: Bot.Config.Spotify.ClientID,
			redirect_uri: RedirectURI,
			scope: ['user-read-private', 'user-read-email', 'user-read-playback-state'].join(' '),
		});

		res.redirect(`https://accounts.spotify.com/authorize?${Params.toString()}`);
	});

	Router.get(
		'/callback',
		(req, res, next) => Strategy.authenticate(req, res, next),
		(_, res) => {
			res.redirect('/auth/spotify/success');
		},
	);

	Router.get('/success', (_, res) => {
		res.send(`
        <html>
            <body>
                <b>Success</b>

                <p>You can close this window now.</p>
            </body>
        </html>
    `);
	});

	Router.get('/me', async (req, res) => {
		const { id, name } = res.locals.authUser as { id: string; name: string };
		const user = await Bot.User.Get(id, name);

		const token = await SpotifyGetValidToken(user, Strategy);

		try {
			const listening = await SpotifyGot('me/player/queue', {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}).json();
			res.json(listening);
		} catch (error) {
			Bot.HandleErrors('Spotify/me', error);

			res.status(500).json({ error: 'Something bad just happened' });
		}
	});

	return Router;
})();
