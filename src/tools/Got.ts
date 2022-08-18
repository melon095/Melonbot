import got from 'got';

export default got.extend({
	headers: { 'User-Agent': 'Melonbot github.com/joachimflottorp/melonbot' },
});
