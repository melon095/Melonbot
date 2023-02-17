import User, { UserDataStoreKeys } from './../../../controller/User/index.js';
import { FastifyInstance } from 'fastify';
import AuthenticationValidator from '../../Hooks/AuthenticationValidator.js';

async function UserHasChannel(user: User): Promise<boolean> {
	const has = await Bot.SQL.Query`
        SELECT name FROM channels where user_id = ${user.TwitchUID} LIMIT 1 
    `;

	return !!has.length;
}

interface ThirdPartyServiceData {
	name: string;
	icon: string;
	authLink: string;
}

async function CheckUserSpotify(user: User): Promise<ThirdPartyServiceData | null> {
	const spotify = await user.Get(UserDataStoreKeys.SpotifyToken);

	if (spotify) {
		return {
			name: 'Spotify',
			icon: 'spotify',
			authLink: '/api/auth/spotify/',
		};
	}

	return null;
}

async function UserGetThirdPartyServices(user: User): Promise<ThirdPartyServiceData[]> {
	const services = [];

	const spotify = await CheckUserSpotify(user);
	if (spotify) {
		services.push(spotify);
	}

	return services;
}

export default async function (fastify: FastifyInstance) {
	await fastify.register(import('./v1/index.js'), { prefix: '/v1' });
	await fastify.register(import('./auth/index.js'), { prefix: '/auth' });

	fastify.route({
		method: 'GET',
		url: '/me',
		preParsing: AuthenticationValidator('JSON'),
		handler: async (req, reply) => {
			const { identifier, username } = req.authenticatedUser!;
			const user = await Bot.User.Get(identifier, username);

			const third_party = await UserGetThirdPartyServices(user);
			const has_channel = await UserHasChannel(user);
			const profile_picture = await user.GetProfilePicture();
			const profile = {
				name: user.Name,
				twitch_uid: user.TwitchUID,
				profile_picture,
			};
			const prefix = Bot.Config.Prefix; // TODO

			return {
				profile,
				third_party,
				has_channel,
				prefix,
			};
		},
	});
}
