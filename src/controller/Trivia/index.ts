import EventEmitter from 'node:events';
import got from './../../tools/Got.js';
import similarity from 'string-similarity';
import { Logger } from './../../logger.js';

const API_URL = 'https://api.gazatu.xyz/trivia/questions';

type Res = {
	question: string;
	answer: string;
	category: string;
	language: string;
	hint1: string | null;
	hint2: string | null;
	submitter?: string;
};

export default class TriviaController extends EventEmitter {
	public initiated = false;

	private id: number;

	private question: string;

	private answer: string;

	private category: string;

	private hints: (string | null)[];

	private block: boolean;

	private hint_len: [number, number];

	private invoker: string;

	constructor() {
		super();
		this.id = 0;
		this.question = '';
		(this.answer = ''), (this.category = '');
		this.hints = [null, null];
		this.block = false;
		this.hint_len = [0, 0];
		this.invoker = '';
	}

	async start(exclude: string, include: string, invoker: string): Promise<void> {
		if (this.block || this.initiated) return;

		this.block = true;

		const uri = new URLSearchParams();

		uri.append('count', '1');

		if (exclude !== '') uri.append('exclude', exclude);

		if (include !== '') uri.append('include', include);

		Bot.Log.Info(`Trivia: ${API_URL}?${uri.toString()}`);

		const { statusCode, body } = await got('json')(API_URL, {
			searchParams: uri,
			throwHttpErrors: false,
		});

		if (statusCode !== 200) {
			Bot.Log.Error(`Trivia: %d %s`, statusCode, body);
			this.emitFail();
			this.block = false;
			return;
		}

		const json = JSON.parse(body);

		const data = json[0] as Res;
		Bot.Log.Info('Trivia: %O', data);

		this.question = data.question;
		this.answer = data.answer;
		this.category = data.category;

		// Expect that hint2 will only contain data when hint1 is null.
		if (data.hint1 !== null && data.hint1.length > 0) {
			this.hints[0] = data.hint1;
			if (data.hint2 !== null && data.hint2.length > 0) this.hints[1] = data.hint2;
		}

		this.invoker = invoker;
		this.initiated = true;
		this.emitReady();
		this.block = false;
		// this.lastrun = Date.now() + (this.cooldown)
	}

	tryAnswer(user: string, attempt: string): void {
		const result =
			similarity.compareTwoStrings(attempt.toLowerCase(), this.answer.toLowerCase()) * 100;

		if (Number(result) > 70.0) {
			this.emitComplete(user, Number(result.toFixed(2)));
			this.reset();
		}
		return;
	}

	trySkip(invoker: string): string {
		if (this.invoker === invoker) {
			this.reset();
			return '(Trivia) SuperVinlin stopped trivia!';
		}
		return '';
	}

	askHint(): { length: [number, number]; copy: string } {
		try {
			let len = 0;

			for (const xd of this.hints) {
				if (xd !== null) len++;
			}

			if (this.hint_len[0] <= len && len !== 0) this.hint_len[0]++;

			if (this.hint_len[1] === 0 && this.hint_len[1] <= len) this.hint_len[1] = len;

			if (this.hints.length > 0 && this.hints[0] !== null) {
				const copy = this.hints[0];
				delete this.hints[0];

				if (this.hints.length > 1) this.hints[0] = this.hints.pop() || '';

				return {
					length: this.hint_len,
					copy: copy || 'There are no more hints',
				};
			} else
				return {
					length: this.hint_len,
					copy: 'There are no more hints',
				};
		} catch (_) {
			return { length: this.hint_len, copy: 'There are no more hints' };
		}
	}

	// private onCooldown(): boolean
	// {
	//     return Date.now() < this.lastrun;
	// }

	// private formatCooldown(): string
	// {
	//     console.log(new Date(this.lastrun * 1000).toISOString());
	//     return `SuperVinlin Slow it down soyboy, you can play in ${new Date(this.lastrun * 1000).toISOString().substr(14, 5)} minutes.`;
	// }

	private reset(): void {
		this.question = '';
		this.answer = '';
		this.category = '';
		this.hints = [null, null];
		this.initiated = false;
		this.hint_len = [0, 0];
		this.invoker = '';
		this.id = Date.now();
	}

	private emitComplete(user: string, sim: number): void {
		this.emit('complete', user, this.answer, sim);
		this.initiated = false;
	}

	private emitTimeout(id: number): void {
		if (this.initiated && id === this.id) {
			this.emit('timeout', this.answer);
			this.initiated = false;
			this.reset();
		}
	}

	private emitFail(): void {
		this.emit('fail');
	}

	private emitReady(): void {
		const id = Date.now();
		this.id = id;
		setTimeout(
			(id) => {
				this.emitTimeout(id);
			},
			60000,
			id,
		); // 60 Seconds, static for now.

		this.emit('ready', this.category, this.question, this.hints[0] !== null ? true : false);
	}
}
