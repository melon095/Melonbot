import { EventEmitter } from 'node:events';
import { ChannelTalkOptions } from './../Typings/types';

export class MessageScheduler extends EventEmitter {
	private Queue: number[];
	private _hasMessage = false;

	constructor() {
		super();
		this.Queue = [];
	}

	schedule(message: string, options: ChannelTalkOptions, cooldown: number) {
		this._hasMessage = true;

		this.Queue.push(
			setTimeout(
				() => {
					this.emit('message', message, options);
					if (this.Queue.length === 0) {
						this._hasMessage = false;
					}
				},
				cooldown,
				true,
			),
		);
	}

	public get hasMessage(): boolean {
		return this._hasMessage;
	}

	/**
	 * @description Wait for all messages to close, do this on exit handler.
	 */
	async closeAll(): Promise<void> {
		while (this.Queue.length > 0) {
			// Wait
		}
		this.emit('close');
		Promise.resolve();
	}
}
