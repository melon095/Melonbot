import got from 'got';

export default got.extend({
	headers: { 'User-Agent': 'Melonbot' },
});
