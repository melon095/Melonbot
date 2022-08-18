import { IPubBase } from 'Singletons/Redis/Data.Types.js';

export class BaseEventSubHandler<MESSAGE_VARIANT extends IPubBase> {
	public constructor(protected Message: MESSAGE_VARIANT) {}

	protected _handle(message: MESSAGE_VARIANT) {}

	public Handle() {
		this._handle(this.Message);
	}
}
