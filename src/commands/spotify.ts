import { EPermissionLevel } from '../Typings/enums.js';
import { CommandModel, TCommandContext, CommandResult, ArgType } from '../Models/Command.js';
import { SpotifyGetValidToken, SpotifyGot } from './../tools/spotify.js';
import Got from './../tools/Got.js';
import StrategyConstructor, { AuthenticationMethod } from './../web/oauth.js';
import { SpotifyTypes } from './../Typings/types.js';
import { Ok } from './../tools/result.js';

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
	async (access_token, refresh_token, expires_in, profile, authUser) => {
		return new Ok(null);
	},
	async (accessToken, authUser) => {},
);

type SongWhipResponse = {
	data: {
		item: {
			name: string;
			url: string;
		};
	};
	status: 'success' | string;
	error: {
		status: number;
		message: string;
		data: {
			url: string;
		};
	};
};

const getSongWhipURL = async (spotifyURL: string): Promise<SongWhipResponse> => {
	return Got('json')<SongWhipResponse>('https://songwhip.com/api/songwhip/create', {
		method: 'POST',
		json: {
			url: spotifyURL,
			country: 'US',
		},
		throwHttpErrors: false,
	}).json();
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
		const token = await SpotifyGetValidToken(ctx.user, Strategy);

		if (!token) {
			return {
				Success: false,
				Result: 'Not logged in to spotify.',
			};
		}

		const { statusCode, body } = await SpotifyGot('me/player', {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (statusCode !== 200) {
			ctx.Log('error', 'Failed to get song from spotify.', { statusCode, body });

			return {
				Success: false,
				Result: 'Failed to get song.',
			};
		}

		const queue = JSON.parse(body) as SpotifyTypes.Player;

		const is_playing = queue.is_playing;
		const item = queue.item;

		if (!is_playing) {
			return {
				Success: true,
				Result: 'No song is currently playing on your spotify.',
			};
		}

		const spotifyURL = item.external_urls.spotify;

		const { data, error } = await getSongWhipURL(spotifyURL);
		if (error !== undefined) {
			ctx.Log('error', 'Failed to get songwhip url.', { error });

			return {
				Success: false,
				Result: 'Failed to get songwhip url.',
			};
		}

		if (!data.item) {
			return {
				Success: false,
				Result: 'Songwhip could not find a song.',
			};
		}

		const name = item.name;
		const artists = item.artists.map((a) => a.name).join(', ');
		const songwhipURL = data.item.url;

		return {
			Success: true,
			Result: `${name} - ${artists} | https://songwhip.com${songwhipURL}`,
		};
	};
}
