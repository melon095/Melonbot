import pino from 'pino';
import { ErrorFunction } from './ErrorHandler.js';

export default function (processType: string, errorFn: ErrorFunction) {
	return new Logger(processType, errorFn);
}

type Levels = 'info' | 'error' | 'warn' | 'debug';

export class Logger {
	private readonly _logger: pino.Logger;

	constructor(private readonly _category: string, private readonly errorFn: ErrorFunction) {
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

	public Debug(arg0: string | Error, ...args: any[]) {
		// TODO: Move this out into one method.

		if (arg0 instanceof Error) {
			this._logger.debug(arg0, `${this._category} | ${arg0.message}`, ...args);
		} else {
			this._logger.debug(`${this._category} | ${arg0}`, ...args);
		}
	}

	public Info(arg0: string | Error, ...args: any[]) {
		if (arg0 instanceof Error) {
			this._logger.info(arg0, `${this._category} | ${arg0.message}`, ...args);
		} else {
			this._logger.info(`${this._category} | ${arg0}`, ...args);
		}
	}

	public Error(arg0: string | Error, ...args: any[]) {
		if (arg0 instanceof Error) {
			this._logger.info(arg0, `${this._category} | ${arg0.message}`, ...args);
		} else {
			this._logger.info(`${this._category} | ${arg0}`, ...args);
		}

		this.errorFn(this._category, arg0, ...args);
	}

	public Warn(arg0: string | Error, ...args: any[]) {
		if (arg0 instanceof Error) {
			this._logger.info(arg0, `${this._category} | ${arg0.message}`, ...args);
		} else {
			this._logger.info(`${this._category} | ${arg0}`, ...args);
		}

		this.errorFn(this._category, arg0, ...args);
	}
}
