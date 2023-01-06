import pino from 'pino';
import { ErrorFunction } from './ErrorHandler.js';

export default function (processType: string, errorFn: ErrorFunction) {
	return new Logger(processType, errorFn);
}

type Levels = 'info' | 'error' | 'warn' | 'debug';

export class Logger {
	private readonly _logger: pino.Logger;

	constructor(
		private readonly _category: string,
		private readonly errorFn: ErrorFunction,
		child?: pino.Logger,
	) {
		if (child) {
			this._logger = child;
		} else {
			this._logger = pino({
				transport: {
					target: 'pino-pretty',
					options: {
						translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
						ignore: 'pid,hostname',
					},
				},
			});
		}
	}

	private static FromChild(_category: string, errorFn: ErrorFunction, child: pino.Logger) {
		return new Logger(_category, errorFn, child);
	}

	private _doLog(level: Levels, message: string | Error, ...args: any[]) {
		const fn = this._logger[level];

		if (message instanceof Error) {
			fn(message, `${this._category} | ${message.message}`, ...args);
		} else {
			fn(`${this._category} | ${message}`, ...args);
		}
	}

	public Debug(arg0: string | Error, ...args: any[]) {
		this._doLog('debug', arg0, args);
	}

	public Info(arg0: string | Error, ...args: any[]) {
		this._doLog('info', arg0, args);
	}

	public Error(arg0: string | Error, ...args: any[]) {
		this._doLog('error', arg0, args);

		this.errorFn(this._category, arg0, ...args);
	}

	public Warn(arg0: string | Error, ...args: any[]) {
		this._doLog('warn', arg0, args);

		this.errorFn(this._category, arg0, ...args);
	}

	public WithCategory(category: string, opts: object = {}) {
		return Logger.FromChild(category, this.errorFn, this._logger.child(opts));
	}
}
