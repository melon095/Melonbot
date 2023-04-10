import { EventEmitter } from 'node:events';
import {
	DEFAULT_MESSAGE_INTERVAL,
	PermissionMode,
	PermissionModeToCooldown,
} from '../controller/DB/Tables/ChannelTable.js';
import { ChannelTalkOptions } from './../Typings/types';

type ScheduledMessage = {
	message: string;
	options: ChannelTalkOptions;
};

export class MessageScheduler extends EventEmitter {
	private Queue: ScheduledMessage[] = [];
	private intervalCounter: NodeJS.Timer;

	public cooldown: number;

	constructor(permission: PermissionMode) {
		super();
		this.Queue = [];
		this.cooldown = PermissionModeToCooldown(permission) ?? DEFAULT_MESSAGE_INTERVAL;

		this.intervalCounter = setInterval(this.onInterval.bind(this), this.cooldown);
	}

	private onInterval() {
		const message = this.Queue.shift();

		if (!message) return;

		this.emit('message', message.message, message.options);
	}

	updateCooldown(cooldown: number) {
		this.cooldown = cooldown;

		clearInterval(this.intervalCounter);

		this.intervalCounter = setInterval(this.onInterval.bind(this), this.cooldown);
	}

	schedule(message: string, options: ChannelTalkOptions) {
		this.Queue.push({ message, options });
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
