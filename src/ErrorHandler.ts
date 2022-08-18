import fs from 'node:fs';
import process from 'node:process';
import { YMD, YMDHMS } from './tools/tools.js';

function CreateStream(): fs.WriteStream {
	return fs.createWriteStream(process.cwd() + '/logs/' + YMD() + '.log', {
		flags: 'w+',
	});
}

function NewStream(): fs.WriteStream {
	logToFile.close();
	return CreateStream();
}

let logToFile = CreateStream();
let date = YMD();
export default function ErrorHandler(
	Category: string,
	Err: Error,
	...args: string[]
): void {
	if (!Err.message) return;
	try {
		if (date !== YMD()) {
			logToFile = NewStream();
			date = YMD();
		}
		logToFile.write(
			process.platform === 'win32'
				? `\r\n${YMDHMS()} - [${Category}] - ${Err} - ${args.join(' ')}`
				: `\n${YMDHMS()} - [${Category}] - ${Err} - ${args.join(' ')}`,
		);

		Bot.SQL.query('INSERT INTO error_logs (error_message) VALUES (?)', [
			Err.message,
		]);
		console.error({ Category, Err, args: args.join(' ') });
	} catch (e) {
		console.error(e);
	}
}

export function CloseErrorHandler(): void {
	logToFile.close();
}
