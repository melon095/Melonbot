import { EPermissionLevel } from '../Typings/enums.js';
import { CommandModel, TCommandContext, CommandResult, ArgType } from '../Models/Command.js';
import { SpotifyGetValidToken, SpotifyGot } from './../tools/spotify.js';
import Got from './../tools/Got.js';
import { SpotifyTypes } from './../Typings/types.js';

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
		const token = await SpotifyGetValidToken(ctx.user);

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

		switch (statusCode) {
			case 204:
				return {
					Success: true,
					Result: 'No song is currently playing on your spotify.',
				};
			case 200:
				break;
			default: {
				ctx.Log('error', 'Failed to get song from spotify.', { statusCode, body });

				return {
					Success: false,
					Result: 'Failed to get song.',
				};
			}
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
