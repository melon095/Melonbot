import { SpotifyTypes } from './../Typings/types.js';
import User from './../controller/User/index.js';
import Strategy from './../web/oauth.js';
import Got from './Got.js';

export const SpotifyGetValidToken = async (
	user: User,
	oauthStrategy: Strategy<SpotifyTypes.Me>,
) => {
	const token = await user.Get('spotify').then((x) => {
		if (!x) return null;

		return JSON.parse(x) as SpotifyTypes.Token;
	});

	if (!token) return null;

	if (token.expires_in < Date.now()) {
		try {
			const newToken = await oauthStrategy.RefreshToken(token.refresh_token);

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

export const SpotifyGot = Got('json').extend({
	prefixUrl: 'https://api.spotify.com/v1/',
	throwHttpErrors: false,
});
