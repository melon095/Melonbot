export type ErrorFunction = <T>(Category: string, Err: T, ...args: string[]) => void;

const Insert = (error_message: string) => {
	Bot.SQL.insertInto('error_logs').values({ error_message }).execute();
};

export default function () {
	return function <T>(Category: string, Err: T, ...args: string[]): void {
		if (Err instanceof Error) {
			try {
				Insert(Err.message);
			} catch (error) {
				Bot.Log.Error('Error while inserting error into database %O', error);
			}
		}

		switch (typeof Err) {
			case 'object': {
				Insert(JSON.stringify(Err, null, 2));
				break;
			}
			case 'number': {
				Insert(Err.toString());
				break;
			}
			case 'string': {
				Insert(Err);
				break;
			}
			default: {
				Bot.Log.Error('Error Handler: Unknown Error Type');
			}
		}

		const opts: { Err: T; args?: string } = {
			Err,
		};

		if (args) {
			opts['args'] = args.join(' ');
		}

		if (opts.Err instanceof Error) {
			Bot.Log.Error(opts.Err, `${Category} %s`, opts.args);
		} else {
			Bot.Log.Error(`${Category} %O`, opts);
		}
	};
}
