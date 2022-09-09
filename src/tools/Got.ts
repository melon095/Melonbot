import got from 'got';

const headers = {
	'User-Agent': 'Melonbot - Twitch Bot',
};

// Got with default headers and prefail hook
export const BaseGot = got.extend({
	headers,
	throwHttpErrors: false,
	timeout: {
		response: 10000,
	},
});

export default (type: 'default' | 'json') => {
	switch (type) {
		case 'default': {
			return BaseGot;
		}
		case 'json': {
			return BaseGot.extend({
				headers: {
					...headers,
					'Content-Type': 'application/json',
				},
			});
		}
	}
};
