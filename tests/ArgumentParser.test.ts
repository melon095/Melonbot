import { CommandModel, ArgType } from '../src/Models/Command';

const parser = CommandModel.ParseArguments;

describe('CommandModel.ParseArguments', () => {
	it('Should parse string arguments', () => {
		const input = ['bad', 'data', 'aaaaah', '--foo', 'bar'];
		const params = [[ArgType.String, 'foo']];

		const result = parser(input, params);

		expect(result).toEqual({
			output: ['bad', 'data', 'aaaaah'],
			values: {
				foo: 'bar',
			},
		});
	});

	it('Should parse boolean arguments', () => {
		const input = ['lol', '--foo', 'bar'];
		const params = [[ArgType.Boolean, 'foo']];

		const result = parser(input, params);

		expect(result).toEqual({
			output: ['lol', 'bar'],
			values: {
				foo: true,
			},
		});
	});

	it('Should parse multiple arguments', () => {
		const input = ['--foo', 'bar', '--baz'];
		const params = [
			[ArgType.String, 'foo'],
			[ArgType.Boolean, 'baz'],
		];

		const result = parser(input, params);

		expect(result).toEqual({
			output: [],
			values: {
				foo: 'bar',
				baz: true,
			},
		});
	});

	it('Can ignore arguments which are not defined', () => {
		const input = ['--foo', 'bar', '--baz', 'yes'];
		const params = [[ArgType.String, 'foo']];

		const result = parser(input, params);

		expect(result).toEqual({
			output: ['--baz', 'yes'],
			values: {
				foo: 'bar',
			},
		});
	});

	it('Can parse short arguments', () => {
		const input = ['--foo', 'bar', '-b'];
		const params = [
			[ArgType.String, 'foo'],
			[ArgType.Boolean, 'baz'],
		];

		const result = parser(input, params);

		expect(result).toEqual({
			output: [],
			values: {
				foo: 'bar',
				baz: true,
			},
		});
	});

	it('Can parse arguments in the middle of the input', () => {
		const input = ['something', '-f', 'bar', '--baz'];
		const params = [
			[ArgType.String, 'foo'],
			[ArgType.Boolean, 'baz'],
		];

		const result = parser(input, params);

		expect(result).toEqual({
			output: ['something'],
			values: {
				foo: 'bar',
				baz: true,
			},
		});
	});

	it('Can parse multiple string arguments', () => {
		const input = ['--foo', 'bar', '--baz', 'qux'];
		const params = [
			[ArgType.String, 'foo'],
			[ArgType.String, 'baz'],
		];

		const result = parser(input, params);

		expect(result).toEqual({
			output: [],
			values: {
				foo: 'bar',
				baz: 'qux',
			},
		});
	});

	it('Can parse multiple boolean arguments', () => {
		const input = ['--foo', 'bar', '-b'];
		const params = [
			[ArgType.Boolean, 'foo'],
			[ArgType.Boolean, 'baz'],
		];

		const result = parser(input, params);

		expect(result).toEqual({
			output: ['bar'],
			values: {
				foo: true,
				baz: true,
			},
		});
	});

	it('Arguments can be parsed independently of its input and definition order', () => {
		const input = ['hi', '--foo', 'bar', 'xD', '--baz', 'qux'];
		const params = [
			[ArgType.String, 'baz'],
			[ArgType.String, 'foo'],
		];

		const result = parser(input, params);

		expect(result).toEqual({
			output: ['hi', 'xD'],
			values: {
				foo: 'bar',
				baz: 'qux',
			},
		});
	});

	it('Can handle weirdly formatted arguments', () => {
		const input = 'hi --foo ["thing","thing2"]'.split(' ');
		const params = [[ArgType.String, 'foo']];

		const result = parser(input, params);

		expect(result).toEqual({
			output: ['hi'],
			values: {
				foo: '["thing","thing2"]',
			},
		});
	});

	it('Can handle emojis', () => {
		const input = 'hi --foo 🤡'.split(' ');
		const params = [[ArgType.String, 'foo']];

		const result = parser(input, params);

		expect(result).toEqual({
			output: ['hi'],
			values: {
				foo: '🤡',
			},
		});
	});

	// it('Should parse arguments with values', () => {
	// 	const input = ['foo', 'bar', '--baz=qux'];
	// 	const args = [[ArgType.String, 'baz']];

	// 	const result = parser(input, args, {});

	// 	expect(result.input).toEqual(['foo', 'bar']);
	// 	expect(result.values).toEqual({ baz: 'qux' });
	// });

	// it('Should handle arguments in the middle of the input', () => {
	// 	const input = ['foo', '--baz=qux', 'bar'];
	// 	const args = [[ArgType.String, 'baz']];

	// 	const result = parser(input, args, {});

	// 	expect(result.input).toEqual(['foo', 'bar']);
	// 	expect(result.values).toEqual({ baz: 'qux' });
	// });

	// it('Should handle multiple arguments', () => {
	// 	const input = ['foo', 'bar', '--baz=qux', '--quux=quuz'];
	// 	const args = [
	// 		[ArgType.String, 'baz'],
	// 		[ArgType.String, 'quux'],
	// 	];

	// 	const result = parser(input, args, {});

	// 	expect(result.input).toEqual(['foo', 'bar']);
	// 	expect(result.values).toEqual({ baz: 'qux', quux: 'quuz' });
	// });

	// it('Should fail on invalid arguments', () => {
	// 	const input = ['foo', '--baz=qux', 'bar', '--quux'];
	// 	const args = [[ArgType.String, 'baz']];

	// 	try {
	// 		parser(input, args, { allowInvalid: false });
	// 	} catch (error) {
	// 		const isError = isCorrectErrorInstance(error);
	// 		expect(isError).toBe(true);
	// 		// Only need this because of typescript..
	// 		if (!isError) {
	// 			throw error;
	// 		}
	// 		expect(error instanceof ParseArgumentsError).toBe(true);
	// 		expect(error.message).toEqual('Invalid argument: quux');
	// 	}
	// });
});
