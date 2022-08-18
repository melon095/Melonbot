#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
console.log('Place in your config.EventSub.Secret :)', {
	secret: randomBytes(36).toString('hex'),
});
