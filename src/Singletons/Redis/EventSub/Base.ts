import { IPubBase, TPubRecType } from 'Singletons/Redis/Data.Types.js';
import Promolve from '@melon95/promolve';
import fs from 'node:fs/promises';
import { getDirname } from './../../../tools/tools.js';
import { Logger } from './../../../logger.js';

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
	Type(): TPubRecType;
	Log?(logger: Logger, arg1: M): void;
	Handle(arg0: M, arg1: Logger): Promise<void> | void;
}

export default async <M extends object>(Type: TPubRecType, Handle: M, logger: Logger) => {
	await ready.promise;

	const handler = handlers[Type];
	if (handler.Log) {
		handler.Log(logger, Handle);
	}

	if (!handler.Handle) {
		return;
	}

	try {
		await handler.Handle(Handle, logger);
	} catch (error) {
		logger.Error(error as Error, `EventSub/Handler/${Type}`);
	}
};
