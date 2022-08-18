import { ChatUserstate } from 'tmi.js';
import { Channel } from './../controller/Channel/index.js';

/**
 * @description Enables bot to moderate chat.
 */
export class ModerationModule {
	/**
	 * @description Reference to parent channel module is tied to.
	 */
	private self: Channel;

	constructor(self: Channel) {
		this.self = self;
	}

	ThankFollow(username: string): void {
		this.self.say(
			'Thanks for following, @' + username + ' peepoFloppaHug',
			{ NoEmoteAtStart: true },
		);
	}
}
