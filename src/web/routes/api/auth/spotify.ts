import StrategyConstructor, {
	AuthenticationMethod,
	OAuthQueryParams,
	UnauthorizedError,
} from './../../../oauth.js';
import { SpotifyTypes } from './../../../../Typings/types.js';
import { CreateSpotifyRequestHeaders } from './../../../../tools/spotify.js';
import { SetUserData, UserDataStoreKeys } from './../../../../IndividualData.js';
import { FastifyInstance } from 'fastify';
import AuthenticationValidator from './../../../Hooks/AuthenticationValidator.js';
import Got from '../../../../tools/Got.js';

export default async function (fastify: FastifyInstance) {
	const RedirectURI = Bot.Config.Services.Website.WebUrl + '/api/auth/spotify/callback';

	const SCOPE = ['user-read-private', 'user-read-email', 'user-read-playback-state'].join(' ');

	const Strategy = new StrategyConstructor<SpotifyTypes.Me>(
		{
			name: 'Spotify',
			redirectURL: RedirectURI,
			authenticationMethod: AuthenticationMethod.Header,
			headers: CreateSpotifyRequestHeaders(),
			tokenURL: 'https://accounts.spotify.com/api/token',
		},
		async (oauth, profile, user) => {
			if (!profile || !user) {
				throw new Error(
					"You can't login because this application is not verified by Spotify. ;)",
				);
			}

			const unix_expires_in = Date.now() + oauth.expiresIn * 1000;
			await SetUserData(user, UserDataStoreKeys.SpotifyToken, {
				access_token: oauth.accessToken,
				refresh_token: oauth.refreshToken,
				expires_in: unix_expires_in,
			});

			return;
		},
		async (accessToken, authUser) => {
			if (!authUser) {
				throw new Error('Please login to Twitch first');
			}

			// TODO: Maybe remove this, we don't use it.
			const { statusCode, body } = await Got['Spotify'].get('me', {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			if (statusCode === 403) {
				throw new UnauthorizedError(
					'User missing from authorized list, as app is in Development mode!',
				);
			}

			return JSON.parse(body) as SpotifyTypes.Me;
		},
	);

	fastify.route({
		method: 'GET',
		url: '/',
		preParsing: AuthenticationValidator('REDIRECT'),
		handler: (req, reply) => {
			const Params = new URLSearchParams({
				response_type: 'code',
				client_id: Bot.Config.Spotify.ClientID,
				redirect_uri: RedirectURI,
				scope: SCOPE,
			});

			const url = 'https://accounts.spotify.com/authorize?';

			reply.redirect(`${url}${Params.toString()}`);
		},
	});

	fastify.route<{ Querystring: OAuthQueryParams }>({
		method: 'GET',
		url: '/callback',
		preParsing: AuthenticationValidator('REDIRECT'),
		preHandler: (req, reply) => Strategy.authenticate(req, reply),
		handler: (req, reply) => {
			reply.redirect('/user/dashboard');
		},
	});
}
