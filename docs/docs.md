# Documentation

### Table of Contents

1. [Writing Commands](#command)
2. [Command Context](#command-context)

#### Command

Commands is code that can be ran by anybody in chat.

It has an identifier, used for calling the command.

### Name

`Type: string`

Name defines the main word that will trigger the command.

### Ping

`Type: boolean`

Setting ping to true will automatically prepend the username of whoever ran the commad in the response.

### Description

`Type: string`

Small description used for quickly explaining what the command does.

### Permission

`Type: EPermissionLevel`

What permission the user requires in the channel to run the command.

```typescript
Permission: EPermissionLevel.VIEWER;
Permission: EPermissionLevel.VIP;
Permission: EPermissionLevel.MOD;
Permission: EPermissionLevel.BROADCASTER;
Permission: EPermissionLevel.ADMIN;
```

### OnlyOffline

`Type: boolean`

If the command is allowed to only be run while the streamer is offline.

### Aliases

```typescript
Type: Array<string>;
```

Other words which can trigger the command

```typescript
Aliases: [
    "foo",
    "bar"
],
```

So if the command is called `baz`, both `foo` and `bar` would trigger the `baz` command.

### Cooldown

`Type: number`

Cooldown field sets how many seconds the user has to wait before they can use this command again.

### Parameters

```typescript
Type: Array<[ArgType, string]>;
```

Parameters are special syntax which extracts words from the input.

Parameters follow a similar syntax as CLI programs.
`<prefix><command> --<keyword> <data>`

Parameters support bool and string data.

Such as `--foo` and `-f`

Or `--foo <data>` and `-f <data>`

Parameters also allow sentences by adding "" or '' between the sentence.
`--foo "this works"`

Parameters have to be manually assigned for every command.

```typescript
Params = [
    [ArgType.String, 'foo'],
    [ArgType.Boolean, 'bar']
],
```

Important to note. Each command has to specifically assign a keyword for it to be extracted.

If the input contains `--forsen` and the command does not state `forsen` is a parameter, it will be ignored and will be in the input field.

### Flags

`Type: CommandFlags`

For example if the command does not want to get checked against the banphrase, if we know that it wont use any user input
or if it will show a static url.

`Flags = [CommandFlags.NO_BANPHRASE];`

### Pre Handlers

`Type: Array<ModBuilder>`

Pre Handlers are similar to how middleware works in a HTTP Framework.

The goal is to run a code block before the final route and to optionally inject data.

Pre Handlers have access to the exact same data as the command would and has the ability to inject data through the `mods` argument or to short circuit the command, with an optional response in chat.

Each Pre Handler can be found [here](./../src/PreHandlers/) and should contain two functions

A `Name` function which is the literal name you access the injected data from.

A `Build` function, the signature is `(ctx: TCommandContext) => Promise<T>` which can do absolutely anything to prepare some sort of data. It can optionally throw a `PreHandlerError` to short circuit.

Every Pre Handler should export two things.

An interface with the data the Builder returns and a default export object that implements ModBuilder.

```typescript
import { PreHandlerError } from '../Models/Errors.js';
import { ModBuilder } from './../Models/Command.js';

export interface MyCoolMod {
	Foo(): string;
}

export default {
	Name: () => 'MyInjectedName',
	Build: async function (ctx) {
		return {
			Foo: () => 'Bar',
		};
	},
} as ModBuilder;
```

and in the command module it should be imported and used as such

```typescript
import { EPermissionLevel } from '../../Typings/enums.js';
import { TCommandContext, ParseArguments } from '../../Models/Command.js';
import ANameForThisMod { MyCoolMod } from './../../PreHandlers/my.cool.mod.js';
import { registerCommand } from '../../controller/Commands/Handler.js';

type PreHandlers = {
    MyInjectedName: MyCoolMod
}

registerCommand<MyCoolMod>({
    ...
    PreHandlers: [ANameForThisMod],
    Code: async function (ctx, mods) {
        mods.MyInjectedName.Foo() === "Bar"
        //                   ^-- true
    },
});

```

### Code

`Type: (ctx: TCommandContext, mods?: PreHandlers) => Promise<CommandResult>`

The code field is what is ran every time the command is used.

The field should be a `async function` to have access to a special `this` binding.

The `this` binding has access to a `EarlyEnd` field which will throw a special `Error` type, ending the command early.

The code field optionally has a `mods` argument injected, however this is related to the [Pre Handler](#pre-handlers) field and should only be used if Pre Handlers have been manually added.

### Long Description

`Type: (prefix: string) => Promise<Array<string>>`

Long Description is a way of going deep into the command, explaining how to use everything about it, wether it is is sub commands or parameters.

It supports markdown and is used for the website.

## Command Context

Within the `Code` method of every command there will be a ctx parameter injected.

This contains a lot of data related to the current channel, current user, input, parameters and other metadata from Twitch.
