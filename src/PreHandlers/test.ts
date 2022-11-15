import { ModBuilder, TCommandContext } from './../Models/Command.js';

export interface TestMod {
	Test: string;
}

export default {
	Name: () => {
		return 'test';
	},
	Build: async (ctx: TCommandContext): Promise<TestMod> => {
		return {
			Test: ctx.input[0] ?? 'forsen',
		};
	},
} as ModBuilder;
