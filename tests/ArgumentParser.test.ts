import { CommandModel, ParseArgumentsError, TArgs, ArgType } from '../src/Models/Command';

const parser = CommandModel.ParseArguments;

const isCorrectErrorInstance = (candidate: unknown): candidate is ParseArgumentsError =>
	candidate instanceof ParseArgumentsError;

describe('CommandModel.ParseArguments', () => {
	it('Should parse arguments', () => {
		const input = ['foo', 'bar', '--baz'];
		const args = [[ArgType.Boolean, 'baz']];

		const result = parser(input, args);

		expect(result.input).toEqual(['foo', 'bar']);
		expect(result.values).toEqual({ baz: true });
	});

	it('Should parse arguments with values', () => {
		const input = ['foo', 'bar', '--baz=qux'];
		const args = [[ArgType.String, 'baz']];

		const result = parser(input, args);

		expect(result.input).toEqual(['foo', 'bar']);
		expect(result.values).toEqual({ baz: 'qux' });
	});

	it('Should handle arguments in the middle of the input', () => {
		const input = ['foo', '--baz=qux', 'bar'];
		const args = [[ArgType.String, 'baz']];

		const result = parser(input, args);

		expect(result.input).toEqual(['foo', 'bar']);
		expect(result.values).toEqual({ baz: 'qux' });
	});

	it('Should handle multiple arguments', () => {
		const input = ['foo', 'bar', '--baz=qux', '--quux=quuz'];
		const args = [
			[ArgType.String, 'baz'],
			[ArgType.String, 'quux'],
		];

		const result = parser(input, args);

		expect(result.input).toEqual(['foo', 'bar']);
		expect(result.values).toEqual({ baz: 'qux', quux: 'quuz' });
	});

	it('Should fail on invalid arguments', () => {
		const input = ['foo', '--baz=qux', 'bar', '--quux'];
		const args = [[ArgType.String, 'baz']];

		try {
			parser(input, args);
		} catch (error) {
			const isError = isCorrectErrorInstance(error);
			expect(isError).toBe(true);
			// Only need this because of typescript..
			if (!isError) {
				throw error;
			}
			expect(error instanceof ParseArgumentsError).toBe(true);
			expect(error.message).toEqual('Invalid argument: quux');
		}
	});
});
