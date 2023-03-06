import { OAuthToken } from './../Typings/types.js';
import User from './../controller/User/index.js';
import Strategy, { AuthenticationMethod } from './../web/oauth.js';
import Got from './Got.js';
import assert from 'node:assert';
import { GetUserData, SetUserData, UserDataStoreKeys } from '../IndividualData.js';

export function SpotifyAuthorizationToken() {
	const { ClientID, ClientSecret } = Bot.Config.Spotify;
	assert.ok(ClientID, 'Spotify ClientID is not set.');
	assert.ok(ClientSecret, 'Spotify ClientSecret is not set.');

	return 'Basic ' + Buffer.from(`${ClientID}:${ClientSecret}`).toString('base64');
}

export function CreateSpotifyRequestHeaders(): Record<string, string> {
	return {
		Authorization: SpotifyAuthorizationToken(),
		'Content-Type': 'application/x-www-form-urlencoded',
	};
}

export async function SpotifyGetValidToken(user: User): Promise<string | null> {
	const tokenContainer = await GetUserData(user, UserDataStoreKeys.SpotifyToken);

	const { inner, err } = tokenContainer.ToJSON<OAuthToken>();

	if (err) return null;

	if (inner.expires_in < Date.now()) {
		try {
			const newToken = await RefreshToken(inner.refresh_token);

			await SetUserData(user, UserDataStoreKeys.SpotifyToken, {
				access_token: newToken.access_token,
				refresh_token: inner.refresh_token,
				expires_in: Date.now() + newToken.expires_in * 1000,
			});

			return newToken.access_token;
		} catch (error) {
			Bot.Log.Error(error as Error, 'Spotify');
			return null;
		}
	}

	return inner.access_token;
}

export async function RefreshToken(refresh_token: string) {
	return Strategy.RefreshToken(refresh_token, {
		authenticationMethod: AuthenticationMethod.Header,
		tokenURL: 'https://accounts.spotify.com/api/token',
		headers: CreateSpotifyRequestHeaders(),
	});
}

export const SpotifyGot = Got('json').extend({
	prefixUrl: 'https://api.spotify.com/v1/',
	throwHttpErrors: false,
});
