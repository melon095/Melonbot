// TODO Improve this.
export default function ErrorHandler(Category: string, Err: Error, ...args: string[]): void {
	if (!Err.message) return;
	try {
		Bot.SQL.Query`INSERT INTO error_logs (error_message) VALUES (${Err.message})`;
		console.error({ Category, Err, args: args.join(' ') });
	} catch (e) {
		console.error(e);
	}
}
