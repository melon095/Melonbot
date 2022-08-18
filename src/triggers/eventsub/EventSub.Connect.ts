import { BaseEventSubHandler } from './EventSub.Base.js';
import { IPubConnect } from 'Singletons/Redis/Data.Types.js';

export default class EventSubConnect extends BaseEventSubHandler<IPubConnect> {
	public constructor(protected Message: IPubConnect) {
		super(Message);
	}

	protected override _handle(message: IPubConnect): void {
		console.log('Connected to EventSub server', {
			Version: message.Version,
		});
	}
}
