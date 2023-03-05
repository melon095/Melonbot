import { ParseArguments, ArgType } from './../src/Models/Command';

describe('CommandModel.ParseArguments', () => {
	it('Should parse string arguments', () => {
		const input = ['bad', 'data', 'aaaaah', '--foo', 'bar'];
		const params = [[ArgType.String, 'foo']];

		const result = ParseArguments(input, params);

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

		const result = ParseArguments(input, params);

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

		const result = ParseArguments(input, params);

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

		const result = ParseArguments(input, params);

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

		const result = ParseArguments(input, params);

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

		const result = ParseArguments(input, params);

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

		const result = ParseArguments(input, params);

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

		const result = ParseArguments(input, params);

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

		const result = ParseArguments(input, params);

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

		const result = ParseArguments(input, params);

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

		const result = ParseArguments(input, params);

		expect(result).toEqual({
			output: ['hi'],
			values: {
				foo: '🤡',
			},
		});
	});

	it('Can parse sentences', () => {
		const FOO = 'this is a sentence';

		const input = `hi --foo "${FOO}"`.split(' ');
		const params = [[ArgType.String, 'foo']];

		const result = ParseArguments(input, params);

		expect(result).toEqual({
			output: ['hi'],
			values: {
				foo: FOO,
			},
		});
	});

	it('Can parse sentences with quotes', () => {
		const FOO = 'this is a sentence';

		const input = `hi --foo '${FOO}'`.split(' ');
		const params = [[ArgType.String, 'foo']];

		const result = ParseArguments(input, params);

		expect(result).toEqual({
			output: ['hi'],
			values: {
				foo: FOO,
			},
		});
	});

	it('Can not parse sentences with mismatching quotes', () => {
		const input = `hi --foo "this is a sentence'`.split(' ');
		const params = [[ArgType.String, 'foo']];

		expect(() => ParseArguments(input, params)).toThrow();
	});

	it('Can not parse sentences without an ending quote', () => {
		const input = `hi --foo "this is a sentence`.split(' ');
		const params = [[ArgType.String, 'foo']];

		expect(() => ParseArguments(input, params)).toThrow();
	});

	it('Can parse sentences in middle of input', () => {
		const FOO = 'this is a sentence';
		const BAR = 'this is another sentence';

		const input = `hi --foo "${FOO}" bye --bar "${BAR}"`.split(' ');
		const params = [
			[ArgType.String, 'foo'],
			[ArgType.String, 'bar'],
		];

		const result = ParseArguments(input, params);

		expect(result).toEqual({
			output: ['hi', 'bye'],
			values: {
				foo: FOO,
				bar: BAR,
			},
		});
	});

	it('Can parse sentences with commas', () => {
		const FOO = 'this is a sentence, with commas';
		const BAR = 'this is another sentence';

		const input = `hi --foo "${FOO}" bye --bar "${BAR}"`.split(' ');
		const params = [
			[ArgType.String, 'foo'],
			[ArgType.String, 'bar'],
		];

		const result = ParseArguments(input, params);

		expect(result).toEqual({
			output: ['hi', 'bye'],
			values: {
				foo: FOO,
				bar: BAR,
			},
		});
	});
});
