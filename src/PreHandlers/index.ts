import { TCommandContext, ModBuilder } from './../Models/Command.js';

type AAA = {
	[key: string]: object;
};

export const Fetch = async <T extends object = object>(
	ctx: TCommandContext,
	mods: ModBuilder[],
): Promise<T> => {
	const done = mods.length
		? await Promise.all(mods.map((builder) => wrap(builder, ctx))).then(normalize)
		: {};

	return done as T;
};

const wrap = (builder: ModBuilder, ctx: TCommandContext): [string, Promise<object>] => [
	builder.Name(),
	builder.Build(ctx),
];

const normalize = async (done: [string, Promise<object>][]) => {
	const normalized: AAA = {};
	for (const [name, mod] of done) {
		normalized[name] = await mod;
	}
	return normalized;
};

export default {
	Fetch,
};
