// TODO Improve this.
export default function ErrorHandler<T>(Category: string, Err: T, ...args: string[]): void {
	if (Err instanceof Error) {
		if (!Err.message) return;
		try {
			Bot.SQL.Query`INSERT INTO error_logs (error_message) VALUES (${Err.message})`.execute();
		} catch (e) {
			console.error(e);
		}
	} else if (typeof Err === 'object') {
		Bot.SQL.Query`INSERT INTO error_logs (error_message) VALUES (${JSON.stringify(
			Err,
		)})`.execute();
	} else if (typeof Err === 'string') {
		Bot.SQL.Query`INSERT INTO error_logs (error_message) VALUES (${Err})`.execute();
	} else {
		console.warn('Error Handler: Unknown Error Type');
	}
	console.error({ Category, Err, args: args.join(' ') });
}
