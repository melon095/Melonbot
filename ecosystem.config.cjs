/* PM2 CONFIGURATION https://pm2.keymetrics.io/ */

const OPTIONS = '--unhandled-rejections=warn ';
const OPTIONS_BOT = OPTIONS + '--inspect=127.0.0.1:9229';
const OPTIONS_WEB = OPTIONS + '--inspect=127.0.0.1:9230';

module.exports = {
	apps: [
		{
			name: 'Bot',
			script: './build/bin/master.js',
			env: {
				NODE_OPTIONS: OPTIONS_BOT,
			},
		},
		{
			name: 'web',
			script: './build/bin/web.js',
			env: {
				NODE_OPTIONS: OPTIONS_WEB,
			},
		},
	],
};
