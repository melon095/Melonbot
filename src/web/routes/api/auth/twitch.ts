import type { Helix } from './../../../../Typings/types.js';
import { Authenticator } from './../../../../web/index.js';
import { SetUserData, UserDataStoreKeys } from './../../../../IndividualData.js';
import HelixAPI from './../../../../Helix/index.js';
import StrategyConstructor, {
	AuthenticationMethod,
	CookieOpts,
	OAuthQueryParams,
} from './../../../oauth.js';
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
	const RedirectURI = Bot.Config.Website.WebUrl + '/api/auth/twitch/callback';

	const Strategy = new StrategyConstructor<Helix.User>(
		{
			name: 'Twitch',
			redirectURL: RedirectURI,
			authenticationMethod: AuthenticationMethod.Query,
			clientID: Bot.Config.Twitch.ClientID,
			clientSecret: Bot.Config.Twitch.ClientSecret,
			tokenURL: 'https://id.twitch.tv/oauth2/token',
		},
		async (oauth, profile) => {
			if (!profile) {
				throw new Error('No profile');
			}

			const { id, login } = profile;

			const user = await Bot.User.Get(id, login);

			const jwt = await Authenticator.SignJWT({
				id: user.ID,
				name: user.Name,
				v: 1,
			});

			await SetUserData(user, UserDataStoreKeys.TwitchToken, {
				access_token: oauth.accessToken,
				refresh_token: oauth.accessToken,
				expires_in: Date.now() + oauth.expiresIn * 1000,
			});

			const cookie: CookieOpts = {
				name: Authenticator.COOKIE_NAME,
				value: jwt,
				httpOnly: false,
				path: '/',
			};

			return { cookie };
		},
		async (accessToken) => {
			/*
                Due to us not knowing the user yet, we need to use the raw function.
            */
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
				throw new Error('There was an error logging you in try again later.');
			}

			return user.inner.data[0];
		},
	);

	fastify.route({
		method: 'GET',
		url: '/',
		handler: (req, reply) => {
			const Params = new URLSearchParams({
				response_type: 'code',
				client_id: Bot.Config.Twitch.ClientID,
				redirect_uri: RedirectURI,
				scope: 'moderator:read:chatters',
			});
			const url = 'https://id.twitch.tv/oauth2/authorize?';

			reply.redirect(`${url}${Params.toString()}`);
		},
	});

	fastify.route<{ Querystring: OAuthQueryParams }>({
		method: 'GET',
		url: '/callback',
		preHandler: (req, reply) => Strategy.authenticate(req, reply),
		handler: (req, reply) => {
			reply.redirect('/');
		},
	});
}
