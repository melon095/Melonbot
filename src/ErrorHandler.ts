// TODO Improve this.
export default function ErrorHandler<T>(Category: string, Err: T, ...args: string[]): void {
	if (Err instanceof Error) {
		if (!Err.message) return;
		try {
			Bot.SQL.Query`INSERT INTO error_logs (error_message) VALUES (${Err.message})`.execute();
			console.error({ Category, Err, args: args.join(' ') });
		} catch (e) {
			console.error(e);
		}
	} else {
		console.error({ Category, Err, args: args.join(' ') });
	}
}
