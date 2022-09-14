import { IPubBase } from 'Singletons/Redis/Data.Types.js';
import Promolve from '@melon95/promolve';
import fs from 'node:fs/promises';
import { getDirname } from './../../tools/tools.js';

const ready = Promolve<void>();
const handlers: Record<string, IEventSubHandler<object>> = {};
const dirname = getDirname(import.meta.url);

(async () => {
	const files = await fs
		.readdir(dirname)
		.then((files) =>
			files.filter((file) => file.endsWith('.js')).filter((file) => !/Base|index/.test(file)),
		);

	for (const file of files) {
		const handler = (await import(`./${file}`)).default as IEventSubHandler<IPubBase>;
		handlers[handler.Type()] = handler;
	}

	ready.resolve();
})();

export interface IEventSubHandler<M extends object> {
	/**
	 * Type in correlation to the redis pubsub event
	 */
	Type(): string;
	Log?(arg0: M): void;
	Handle(arg0: M): void;
}

export default async <M extends object>(Type: string, Handle: M) => {
	await ready.promise;

	const handler = handlers[Type];
	if (handler.Log) {
		handler.Log(Handle);
	}
	handler.Handle(Handle);
};
