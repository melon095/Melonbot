import { BaseEventSubHandler } from './EventSub.Base.js';
import { IPubModRemove } from 'Singletons/Redis/Data.Types.js';

export default class EventSubConnect extends BaseEventSubHandler<IPubModRemove> {
	public constructor(protected Message: IPubModRemove) {
		super(Message);
	}

	protected override _handle(message: IPubModRemove): void {
		console.log('EventSubModRemove', { message });

		if (message.user_id !== Bot.ID) {
			return;
		}

		const chl = Bot.Twitch.Controller.channels.find(
			(c) => c.Id === message.broadcaster_user_id,
		);

		if (!chl) {
			console.warn('EventSub.ModeratorRemove: Channel not found', {
				message,
			});
			return;
		}

		chl.setNorman(); // TODO Vip handling
	}
}
