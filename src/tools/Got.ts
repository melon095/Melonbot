import got from 'got';

const headers = {
	'User-Agent': 'Melonbot',
};

export default (type: 'default' | 'json') => {
	switch (type) {
		case 'default': {
			return got.extend({
				headers,
			});
		}
		case 'json': {
			return got.extend({
				headers: {
					...headers,
					'Content-Type': 'application/json',
				},
			});
		}
	}
};
