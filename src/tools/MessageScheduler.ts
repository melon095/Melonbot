import { EventEmitter } from 'node:events';
import { ChannelTalkOptions } from './../Typings/types';

export class MessageScheduler extends EventEmitter {
	private Queue: number[];

	constructor() {
		super();
		this.Queue = [];
	}

	schedule(message: string, options: ChannelTalkOptions, cooldown: number) {
		this.Queue.push(
			setTimeout(
				() => {
					this.emit('message', message, options);
				},
				cooldown,
				true,
			),
		);
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
