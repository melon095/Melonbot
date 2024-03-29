import User from './../../../controller/User/index.js';
import { FastifyInstance } from 'fastify';
import AuthenticationValidator from '../../Hooks/AuthenticationValidator.js';
import { UserDataStoreKeys, GetUserData } from '../../../IndividualData.js';

async function UserHasChannel(user: User): Promise<boolean> {
	return Boolean(
		await Bot.SQL.selectFrom('channels')
			.select('name')
			.where('user_id', '=', user.TwitchUID)
			.limit(1)
			.execute(),
	);
}

async function CheckUserSpotify(user: User): Promise<string | null> {
	const spotify = await GetUserData(user, UserDataStoreKeys.SpotifyToken);

	if (spotify.ToString()) {
		return 'Spotify';
	}

	return null;
}

async function UserGetThirdPartyServices(user: User): Promise<string[]> {
	const services = [];

	const spotify = await CheckUserSpotify(user);
	if (spotify) {
		services.push(spotify);
	}

	return services;
}

export default async function (fastify: FastifyInstance) {
	await fastify.register(import('./user/index.js'), { prefix: '/user' });
	await fastify.register(import('./auth/index.js'), { prefix: '/auth' });
	await fastify.register(import('./v1/index.js'), { prefix: '/v1' });

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
