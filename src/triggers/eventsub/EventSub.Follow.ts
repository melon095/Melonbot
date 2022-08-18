import { BaseEventSubHandler } from './EventSub.Base.js';
import { IPubFollow } from 'Singletons/Redis/Data.Types.js';

export default class EventSubFollow extends BaseEventSubHandler<IPubFollow> {
	public constructor(protected Message: IPubFollow) {
		super(Message);
	}

	protected override _handle(message: IPubFollow): void {
		console.log('EventSubFollow', { message });

		const chl = Bot.Twitch.Controller.channels.find(
			(c) => c.Id === message.broadcaster_user_id,
		);

		if (!chl) {
			console.warn('EventSub.Follow: Channel not found', {
				message,
			});
			return;
		}

		// TODO check for chinese | japanese characters, and then do username rather than display name.
		chl.ModerationModule?.ThankFollow(message.user_name);
	}
}
