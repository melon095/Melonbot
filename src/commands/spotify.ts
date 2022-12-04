import { EPermissionLevel } from '../Typings/enums.js';
import { CommandModel, TCommandContext, CommandResult, ArgType } from '../Models/Command.js';
import { SpotifyGetValidToken, SpotifyGot } from './../tools/spotify.js';
import Got from './../tools/Got.js';
import User from 'controller/User/index.js';
import StrategyConstructor, { AuthenticationMethod } from './../web/oauth.js';
import { SpotifyTypes } from './../Typings/types.js';

const { ClientID, ClientSecret } = Bot.Config.Spotify;
const Authorization = 'Basic ' + Buffer.from(`${ClientID}:${ClientSecret}`).toString('base64');

// TODO: Get rid of this.
const Strategy = new StrategyConstructor(
	{
		name: 'Spotify',
		redirectURL: '',
		authenticationMethod: AuthenticationMethod.Header,
		headers: {
			Authorization,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		tokenURL: 'https://accounts.spotify.com/api/token',
	},
	async (access_token, refresh_token, expires_in, profile, authUser, done) => {},
	async (accessToken, authUser) => {},
);

type SongWhipResponse = {
	data: {
		items: {
			name: string;
			url: string;
		}[];
	};
	status: 'success' | string;
};

const getSongWhipURL = async (spotifyURL: string): Promise<SongWhipResponse> => {
	const { body } = await Got('json')<SongWhipResponse>(
		'https://songwhip.com/api/songwhip/create',
		{
			method: 'POST',
			json: {
				url: spotifyURL,
				country: 'US',
			},
			throwHttpErrors: false,
		},
	);

	return body;
};

export default class extends CommandModel {
	Name = 'spotify';
	Ping = false;
	Description = 'Get the currently playing song from Spotify.';
	Permission = EPermissionLevel.VIEWER;
	OnlyOffline = false;
	Aliases = [];
	Cooldown = 5;
	Params = [[ArgType.String, 'channel']];
	Flags = [];
	PreHandlers = [];
	Code = async (ctx: TCommandContext): Promise<CommandResult> => {
		const token = await SpotifyGetValidToken(ctx.user, Strategy.RefreshToken);

		if (!token) {
			return {
				Success: false,
				Result: 'Not logged in to spotify.',
			};
		}

		const { statusCode, body } = await SpotifyGot('me/player/queue', {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (statusCode !== 200) {
			Bot.HandleErrors('Spotify', statusCode, body);

			return {
				Success: false,
				Result: 'Failed to get queue.',
			};
		}

		const queue = JSON.parse(body) as SpotifyTypes.Queue;

		const playing = queue.currently_playing;

		if (!playing) {
			return {
				Success: false,
				Result: 'Nothing is playing.',
			};
		}

		const spotifyURL = playing.external_urls.spotify;

		const { status, data } = await getSongWhipURL(spotifyURL);
		if (status !== 'success') {
			return {
				Success: false,
				Result: 'Failed to get songwhip url.',
			};
		}

		if (!data.items.length) {
			return {
				Success: false,
				Result: 'Songwhip could not find a song.',
			};
		}

		const songwhipURL = data.items[0].url;

		const name = playing.name;
		const artists = playing.artists.map((a) => a.name).join(', ');

		return {
			Success: true,
			Result: `${name} - ${artists} | ${songwhipURL}`,
		};
	};
}
