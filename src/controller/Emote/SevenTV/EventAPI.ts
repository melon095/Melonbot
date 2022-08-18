import MWebSocket from '../../../Models/Websocket.js';
import WebSocket from 'ws';

type SevenTVPayload = {
	channel: string;
	emote_id: string;
	name: string;
	action: 'REMOVE' | 'ADD';
	actor: string;
	emote: null | SevenTVEmote;
};

type SevenTVEmote = {
	name: string;
	visibility: number;
	mime: 'image/webp';
	tags: string[];
	width: number[];
	height: number[];
	animated: boolean;
	urls: unknown; // Cba doing this one lol
	owner: SevenTVEmoteOwner;
};

type SevenTVSuccess = 'join' | 'part';

type SevenTVEmoteOwner = {
	id: string;
	twitch_id: number;
	display_name: string;
	login: string;
};

type SevenTVMessage = {
	action: 'ping' | 'success' | 'update';
	payload: SevenTVSuccess | SevenTVPayload;
};

const SEVENTV_EVENTAPI_URL = 'events.7tv.app/v1/channel-emotes';
const PUSH_INTERVAL = 15000;
const EMOTES: Record<string, EMOTE_TYPE[]> = {};

type EMOTE_TYPE = { type: '+' | '-'; name: string };

function split_array(array: any[], size: number) {
	const result = [];
	for (let i = 0; i < array.length; i += size) {
		result.push(array.slice(i, i + size));
	}
	return result;
}

function Commit(channel: string, emote: EMOTE_TYPE) {
	if (EMOTES[channel] === undefined) EMOTES[channel] = [];
	EMOTES[channel].push(emote);
}

function Remove(channel: string, emote: EMOTE_TYPE) {
	EMOTES[channel] = EMOTES[channel].filter(
		(e) => e.name !== emote.name && e.type !== emote.type,
	);
}

function Push() {
	setInterval(() => {
		for (const channel of Bot.Twitch.Emotes.SevenTVEvent.List) {
			if (EMOTES[channel] === undefined) continue;
			if (EMOTES[channel].length === 0) continue;

			const emotes_to_send = EMOTES[channel];
			EMOTES[channel] = [];

			const payload: string[] = [];
			for (const emote of emotes_to_send) {
				switch (emote.type) {
					case '+': {
						payload.push(`+${emote.name}`);
						break;
					}
					case '-': {
						payload.push(`-${emote.name}`);
						break;
					}
				}
			}

			const _ch = Bot.Twitch.Controller.TwitchChannelSpecific({
				Name: channel,
			});
			if (!_ch) return;

			const chunks = split_array(payload, 6);
			for (const chunk of chunks) {
				_ch.say(`7TV Update ${chunk.join(' ')}`, {
					NoEmoteAtStart: true,
				});
			}

			Bot.Twitch.Emotes.SevenTVEvent.Log(
				'Emote 7TV Update ',
				JSON.stringify({
					channel,
					payload,
				}),
			);
		}
	}, PUSH_INTERVAL);
}

export class SevenTVEvent extends MWebSocket {
	public List: string[];

	constructor() {
		super('7TV', SEVENTV_EVENTAPI_URL);
		this.List = [];

		setInterval(() => {
			if (!this.IsOpen) this.Reconnect();
		}, 45000);

		Push();
	}

	override OpenListener(): boolean {
		super.Log('EventAPI Connection Opened!');
		return true;
	}

	override CloseListener(
		e: WebSocket.CloseEvent,
	): WebSocket.CloseEvent | void {
		if (!this.manualExit) super.Log('Connection closed by server. ', e);
		this.Reconnect();
	}

	override MessageListener(e: WebSocket.MessageEvent): void {
		const data: SevenTVMessage = JSON.parse(e.data as string);

		switch (data.action) {
			case 'ping': {
				super.Log('Heartbeat');
				break;
			}

			case 'update': {
				const payload: SevenTVPayload = JSON.parse(
					data.payload as string,
				);
				const channel = Bot.Twitch.Controller.TwitchChannelSpecific({
					Name: payload.channel,
				});
				if (!channel) break;
				switch (payload.action) {
					case 'ADD': {
						Commit(payload.channel, {
							type: '+',
							name: payload.name,
						});
						break;
					}

					case 'REMOVE': {
						Commit(payload.channel, {
							type: '-',
							name: payload.name,
						});
					}
				}
				break;
			}
			default:
				break;
		}
	}

	override OnReconnect(): void {
		for (const channel of this.List) this.addChannel(channel);
	}

	override ErrorListener(e: WebSocket.ErrorEvent): Error {
		const error = new Error(`${e.message} ${e.error}`);
		Bot.HandleErrors(this.category, error);
		Bot.Twitch.Controller.Whisper(
			{
				Username: Bot.Twitch.Controller.owner,
				ID: Bot.Config.OwnerUserID,
			},
			'Your EventAPI Socket Just broke dumbo! :)',
		);
		return error;
	}

	async addChannel(channel: string): Promise<void> {
		this.waitConnect().then(() => {
			if (!this.List.includes(channel)) this.List.push(channel);
			if (this.ws) {
				this.ws.send(
					JSON.stringify({ action: 'join', payload: channel }),
				);
				super.Log(`Joined ${channel}`);
			}
		});
	}

	async removeChannel(channel: string): Promise<void> {
		if (this.List.includes(channel)) {
			this.waitConnect().then(() => {
				if (this.ws) {
					this.ws.send(
						JSON.stringify({ action: 'part', payload: channel }),
					);
					super.Log(`Parted ${channel}`);
				}
				this.List.filter((a) => a !== channel);
			});
		}
	}

	HideNotification(
		channel: string,
		emote: string,
		type: 'ADD' | 'REMOVE',
	): void {
		if (EMOTES[channel] === undefined) return;

		switch (type) {
			case 'ADD': {
				Remove(channel, { type: '+', name: emote });
				break;
			}
			case 'REMOVE': {
				Remove(channel, { type: '-', name: emote });
				break;
			}
		}
	}
}
