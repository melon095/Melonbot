import { CommandModel, TArgs } from '../src/Models/Command';

const parser = CommandModel.ParseArguments;

describe('CommandModel.ParseArguments', () => {
	it('Should parse arguments', () => {
		const input = ['foo', 'bar', '--baz'];
		const args: TArgs[] = [{ name: 'baz', type: 'boolean' }];

		const result = parser(input, args);

		expect(result.input).toEqual(['foo', 'bar']);
		expect(result.values).toEqual({ baz: true });
	});

	it('Should parse arguments with values', () => {
		const input = ['foo', 'bar', '--baz=qux'];
		const args: TArgs[] = [{ name: 'baz', type: 'string' }];

		const result = parser(input, args);

		expect(result.input).toEqual(['foo', 'bar']);
		expect(result.values).toEqual({ baz: 'qux' });
	});

	it('Should handle arguments in the middle of the input', () => {
		const input = ['foo', '--baz=qux', 'bar'];
		const args: TArgs[] = [{ name: 'baz', type: 'string' }];

		const result = parser(input, args);

		expect(result.input).toEqual(['foo', 'bar']);
		expect(result.values).toEqual({ baz: 'qux' });
	});
});
