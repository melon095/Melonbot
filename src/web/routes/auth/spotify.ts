import { AuthenticationMethod } from './../../oauth.js';
import Got from './../../../tools/Got.js';
import User from './../../../controller/User/index.js';

declare namespace SpotifyTypes {
	export interface Me {
		country: string;
		display_name: string;
		email: string;
		explicit_content: {
			filter_enabled: boolean;
			filter_locked: boolean;
		};
		external_urls: {
			spotify: string;
		};
		followers: {
			href: null;
			total: number;
		};
		href: string;
		id: string;
		images: {
			height: number;
			url: string;
			width: number;
		}[];
		product: 'premium' | 'free' | 'open';
		type: 'user';
		uri: string;
	}

	export interface CurrentlyPlaying {
		album: {
			album_type: 'album' | 'single' | 'compilation';
			artists: {
				external_urls: {
					spotify: string;
				};
				href: string;
				id: string;
				name: string;
				type: 'artist';
				uri: string;
			}[];
			available_markets: string[];
			external_urls: {
				spotify: string;
			};
			href: string;
			id: string;
			images: {
				height: number;
				url: string;
				width: number;
			}[];
			name: string;
			type: 'album';
			uri: string;
		};
		artists: unknown;
		disc_number: number;
		duration_ms: number;
		explicit: boolean;
		external_ids: {
			isrc: string;
		};
		external_urls: {
			spotify: string;
		};
		href: string;
		id: string;
		is_local: boolean;
		name: string;
		popularity: number;
		preview_url: string;
		track_number: number;
		type: 'track';
		uri: string;
	}

	export interface Token {
		access_token: string;
		refresh_token: string;
		expires_in: number;
	}
}

const SpotifyGot = Got('json').extend({
	prefixUrl: 'https://api.spotify.com/v1/',
	throwHttpErrors: false,
});

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
				done(new Error("Can't find a Twitch or Spotify account, try relogging in again."));
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

	const SpotifyGetValidToken = async (user: User) => {
		const token = await user.Get('spotify').then((x) => {
			if (!x) return null;

			return JSON.parse(x) as SpotifyTypes.Token;
		});

		if (!token) return null;

		if (token.expires_in < Date.now()) {
			try {
				const newToken = await Strategy.RefreshToken(token.refresh_token);

				await user.Set('spotify', {
					access_token: newToken.access_token,
					refresh_token: token.refresh_token,
					expires_in: Date.now() + newToken.expires_in * 1000,
				});

				return newToken.access_token;
			} catch (error) {
				Bot.HandleErrors('Spotify', error);
				return null;
			}
		}

		return token.access_token;
	};

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

		const token = await SpotifyGetValidToken(user);

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
