export interface CrontabOpts {
	/** The function to be executed. */
	func: () => Promise<void> | void;
	/** The interval in milliseconds. */
	interval: number;
	/** Run the function immediately. */
	runImmediately?: boolean;
}

/**
 * CreateCrontab wraps a function to be executed at a interval.
 *
 * @returns A function that can be used to stop the crontab.
 */
export function CreateCrontab(opts: CrontabOpts): Function {
	const location = new Error().stack?.split('\n')[2].trim().replace('at ', '');
	let interval: number;
	let timeout: NodeJS.Timer;

	const wrapper = async () => {
		try {
			await opts.func();
		} catch (error) {
			if (error instanceof Error) {
				Bot.Log.Error(error, 'A crontab errored');
			} else {
				Bot.Log.Error('A crontab errored out at %O reason %O', location, error);
			}
		}
	};

	const start = () => {
		interval = opts.interval;
		if (opts.runImmediately) wrapper();

		timeout = setInterval(wrapper, interval);
	};

	const stop = () => {
		clearInterval(timeout);
	};

	Bot.Log.Info(`Created crontab %O`, {
		location,
	});

	start();

	return stop;
}
