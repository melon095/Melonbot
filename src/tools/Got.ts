import got from 'got';

const headers = {
	'User-Agent': 'Melonbot',
};

const BaseGot = got.extend({
	headers,
	throwHttpErrors: false,
	timeout: {
		response: 10000,
	},
});

const HelixGot = BaseGot.extend({
	prefixUrl: 'https://api.twitch.tv/helix',
});

const IvrGot = BaseGot.extend({
	prefixUrl: 'https://api.ivr.fi/v2/twitch/',
});

const MagnoliaGot = BaseGot.extend({
	prefixUrl: 'https://magnolia.melon095.live/api/',
});

// FIXME: Add auth header here?
const SpotifyGot = BaseGot.extend({
	prefixUrl: 'https://api.spotify.com/v1/',
});

export default {
	Default: BaseGot,
	Helix: HelixGot,
	Ivr: IvrGot,
	Magnolia: MagnoliaGot,
	Spotify: SpotifyGot,
} as const;
