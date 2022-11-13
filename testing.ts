type Context = {
	something: {
		data: string;
	};
};

type ModBuilderFn<T extends object = object> = (ctx: Context) => T;

type ModBuilderDefault<T extends object = object> = ModBuilderFn<T>;

type ModBuilder<Fn extends ModBuilderFn = ModBuilderFn> = (ctx: Context) => ReturnType<Fn>;

type Command<M extends object = object> = (ctx: Context, mods: M) => void;

type FooMod = {
	fn: () => string;
};

const modBuilder: ModBuilder<ModBuilderFn<FooMod>> = (ctx) => {
	return {
		fn: () => ctx.something.data,
	};
};

type CommandMods = {
	foo?: FooMod;
};

const command: Command<CommandMods> = (ctx, mods) => {
	const { foo } = mods;

	foo?.fn();
};

type PreliminaryCommand<
	C extends Command = Command,
	Mods extends ModBuilder[] = ModBuilderDefault[],
> = {
	command: C;
	mods: Mods;
};

const commands: PreliminaryCommand[] = [];

const addCommand = <C extends Command, Mods extends ModBuilder[]>(command: C, mods: Mods) => {
	commands.push({ command, mods });
};

addCommand(command, [modBuilder]);

// command({ something: { data: 'data' } }, { foo: mod });
