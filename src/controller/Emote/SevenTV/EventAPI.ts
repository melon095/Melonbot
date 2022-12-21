import MWebSocket from '../../../Models/Websocket.js';
import WebSocket from 'ws';
import { Channel } from './../../../controller/Channel/index.js';
import gql, { ConnectionPlatform } from './../../../SevenTVGQL.js';

// op -- 0
// When an event gets fired
// T relevant to type
type SevenTVOpDispatch<T = object> = {
	type: string;
	body: T;
};

// op -- 1
// type SevenTVOpHello = {
// 	heartbeat_interval: number;
// 	session_id: string;
// };

// op -- 2
type SevenTVOpHeartbeat = {
	count: number;
};

// type SevenTVRequest = {
// 	type: string;
// 	condition: object;
// };

// op -- 7
type SevenTVOpEndOfStream = {
	code: number;
	message: string;
};

type SevenTVEmoteSetUpdate = {
	id: string;
	kind: number;
	actor: Actor;
	/** Pushed is when an emote is added. */
	pushed?: Pushed[];
	/** Pulled is when an emote is removed. */
	pulled?: Pulled[];
	/** Updated is when an emote is aliased */
	updated?: Updated[];
};

interface Connection {
	id: string;
	platform: string;
	linked_at: any;
	emote_set_id: string;
}

interface Actor {
	id: string;
	username: string;
	display_name: string;
	roles: any[];
	connections: Connection[];
}

interface Emote {
	created_at: string;
	flags: number;
	id: string;
	images: string[];
	name: string;
	owner_id: string;
	tags: any[];
}

interface OldValue {
	actor_id: string;
	flags: number;
	id: string;
	name: string;
	timestamp: string;
}

interface Value {
	actor_id: string;
	emote: Emote;
	flags: number;
	id: string;
	name: string;
	timestamp: string;
}

interface Pulled {
	key: string;
	index: number;
	old_value: OldValue;
	value: null;
}

interface Pushed {
	key: string;
	index: number;
	value: Value;
}

interface Updated {
	key: string;
	index: number;
	old_value: OldValue;
	value: Value;
}

/**
 * Base message to 7TV
 * T is relevant to the operation code (op)
 */
type SevenTVMessage<T = object> = {
	op: number;
	t: number; // Unix timestamp
	d: T;
};

export interface SevenTVChannelIdentifier {
	Channel: string;
	EmoteSet: string;
}

const Opcodes = {
	/** On event */
	Dispatch: 0,
	/** On connect */
	Hello: 1,
	/** Ping */
	Heartbeat: 2,
	/** Server acknowledges our request */
	ACK: 5,
	/** Something bad happened, closes connection. */
	EndOfStream: 7,
	/** We send, subscribe to event */
	Subscribe: 35,
	/** We send, unsub from request */
	UnSubscribe: 36,
};

const SEVENTV_EVENTAPI_URL = 'events.7tv.io/v3';
const PUSH_INTERVAL = 15000;
const EMOTES: ArrayIdentifier = {};

type EMOTE_TYPE = {
	type: '+' | '-';
	name: string;
};

/**
 * ChannelName -- EmoteSetID -- EMOTE_TYPE[]
 */
type ArrayIdentifier = Record<string, Record<string, EMOTE_TYPE[]>>;

const newArrayIdentifier = ({ Channel, EmoteSet }: SevenTVChannelIdentifier) =>
	(EMOTES[Channel] = { [EmoteSet]: [] });

function split_array<T>(array: T[], size: number) {
	const result = [];
	for (let i = 0; i < array.length; i += size) {
		result.push(array.slice(i, i + size));
	}
	return result;
}

function Commit(identifier: SevenTVChannelIdentifier, emote: EMOTE_TYPE) {
	if (EMOTES[identifier.Channel] === undefined) newArrayIdentifier(identifier);

	EMOTES[identifier.Channel][identifier.EmoteSet].push(emote);
}

function Push() {
	setInterval(() => {
		for (const identifier of Bot.Twitch.Emotes.SevenTVEvent.List) {
			if (EMOTES[identifier.Channel] === undefined) continue;
			if (!EMOTES[identifier.Channel][identifier.EmoteSet]?.length) continue;

			const emotes_to_send = EMOTES[identifier.Channel][identifier.EmoteSet];
			newArrayIdentifier(identifier);

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
				Name: identifier.Channel,
			});
			if (!_ch) continue;

			const chunks = split_array(payload, 6);
			for (const chunk of chunks) {
				_ch.say(`7TV Update ${chunk.join(' ')}`);
			}

			Bot.Twitch.Emotes.SevenTVEvent.Log(
				'Emote 7TV Update ',
				JSON.stringify({
					Channel: identifier,
					Payload: payload,
				}),
			);
		}
	}, PUSH_INTERVAL);
}

const createMessage = (code: number, data: object): string => JSON.stringify({ op: code, d: data });

export class SevenTVEvent extends MWebSocket {
	public List: SevenTVChannelIdentifier[];

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

	override CloseListener(e: WebSocket.CloseEvent): WebSocket.CloseEvent | void {
		if (!this.manualExit) {
			super.Log('Connection closed by server. ', e);
			this.Reconnect();
		}
	}

	override MessageListener(e: WebSocket.MessageEvent): void {
		const data: SevenTVMessage = JSON.parse(e.data.toString());

		switch (data.op) {
			case Opcodes.Dispatch: {
				const d = data.d as SevenTVOpDispatch;
				this.handleDispatch(d);
				break;
			}
			case Opcodes.Hello: {
				super.Log('7TV Said Hi :D');
				break;
			}
			case Opcodes.Heartbeat: {
				const d = data.d as SevenTVOpHeartbeat;
				super.Log('Heartbeat Count: ', d.count);
				break;
			}
			case Opcodes.ACK: {
				return;
			}
			case Opcodes.EndOfStream: {
				const d = data.d as SevenTVOpEndOfStream;
				super.Log('Closing connection -- reconnecting: : ', d);
				break;
			}
			default: {
				super.Log(`Unknown OP: ${data.op}`);
				super.Log(`Data: ${JSON.stringify(data)}`);
			}
		}
	}

	private async handleDispatch(data: SevenTVOpDispatch) {
		const type = data.type;
		switch (type) {
			case 'emote_set.update': {
				const payload = data.body as SevenTVEmoteSetUpdate;

				const channel = await gql.getUserByEmoteSet(payload.id).then((res) => {
					const t = res.user.connections.find(
						(c) => c.platform === ConnectionPlatform.TWITCH,
					);

					if (!t) return null;

					return Bot.Twitch.Controller.TwitchChannelSpecific({ ID: t.id });
				});

				if (!channel) {
					super.Log('Channel not found for emote set update', JSON.stringify(payload));
					return;
				}

				// Ignore our own updates.
				if (payload.actor.id === Bot.Config.SevenTV.user_id) {
					return;
				}

				if (typeof payload.pushed !== 'undefined') {
					this.handleNewEmote(payload, channel);
				} else if (typeof payload.pulled !== 'undefined') {
					this.handleRemovedEmote(payload, channel);
				} else if (typeof payload.updated !== 'undefined') {
					this.handleUpdatedEmote(payload, channel);
				} else {
					super.Log(`Received bad data ${JSON.stringify(payload)}`);
				}
			}
		}
	}

	private async handleNewEmote(data: SevenTVEmoteSetUpdate, channel: Channel) {
		const emotes = data.pushed ?? [];

		for (const emote of emotes) {
			const identifier: SevenTVChannelIdentifier = {
				Channel: channel.Name,
				EmoteSet: data.id,
			};

			Commit(identifier, {
				type: '+',
				name: emote.value.name,
			});
		}
	}

	private async handleRemovedEmote(data: SevenTVEmoteSetUpdate, channel: Channel) {
		const emotes = data.pulled ?? [];

		for (const emote of emotes) {
			const identifier: SevenTVChannelIdentifier = {
				Channel: channel.Name,
				EmoteSet: data.id,
			};

			Commit(identifier, {
				type: '-',
				name: emote.old_value.name,
			});
		}
	}

	private async handleUpdatedEmote(data: SevenTVEmoteSetUpdate, channel: Channel) {
		const emotes = data.updated ?? [];

		for (const emote of emotes) {
			const identifier: SevenTVChannelIdentifier = {
				Channel: channel.Name,
				EmoteSet: data.id,
			};

			Commit(identifier, {
				type: '-',
				name: emote.old_value.name,
			});

			Commit(identifier, {
				type: '+',
				name: emote.value.name,
			});
		}
	}

	override OnReconnect(): void {
		const copy = [...this.List];
		this.List = [];

		for (const channel of copy) {
			this.addChannel(channel);
		}
	}

	override ErrorListener(e: WebSocket.ErrorEvent): Error {
		const error = new Error(`${e.message} ${e.error}`);
		Bot.HandleErrors(this.category, error);
		return error;
	}

	addChannel(channel: SevenTVChannelIdentifier): void {
		this.waitConnect().then(() => {
			if (this.isInList(channel)) {
				return;
			}

			this.List.push(channel);

			if (!this.ws) {
				return;
			}

			this.ws.send(
				createMessage(Opcodes.Subscribe, {
					type: 'emote_set.update',
					condition: {
						object_id: channel.EmoteSet,
					},
				}),
			);

			super.Log(`Joined`, { Channel: channel.Channel });
		});
	}

	removeChannel(channel: SevenTVChannelIdentifier): void {
		if (!this.isInList(channel)) {
			return;
		}

		this.waitConnect().then(() => {
			if (!this.ws) {
				return;
			}

			this.removeFromList(channel);

			this.ws.send(
				createMessage(Opcodes.UnSubscribe, {
					type: 'emote_set.update',
					condition: { object_id: channel.EmoteSet },
				}),
			);

			super.Log(`Parted`, { Channel: channel.Channel });
			return;
		});
	}

	protected isInList({ Channel, EmoteSet }: SevenTVChannelIdentifier): boolean {
		return (
			this.List.find((a) => a.Channel === Channel && a.EmoteSet === EmoteSet) !== undefined
		);
	}

	protected removeFromList({ Channel, EmoteSet }: SevenTVChannelIdentifier): void {
		this.List = this.List.filter((a) => a.Channel !== Channel && a.EmoteSet !== EmoteSet);
	}
}
