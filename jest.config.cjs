module.exports = {
	preset: 'ts-jest/presets/js-with-babel',
	globals: {
		'ts-jest': {
			useESM: true,
		},
	},
	transform: {
		'^.*\\.(t|j)sx?$': [
			'jest-chain-transform',
			{
				transformers: ['ts-jest', 'babel-jest'],
			},
		],
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs', 'node'],
	transformIgnorePatterns: ['/node_modules/(?!(@melon095/promolve)/)'],
	moduleDirectories: ['node_modules', '<rootDir>'],
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
		'^src/(.*)': '<rootDir>/src/$1',
	},
	testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
	testEnvironment: 'node',
	roots: ['src'],
	extensionsToTreatAsEsm: ['.jsx', '.ts', '.tsx'],
	verbose: true,
	silent: false,
};
