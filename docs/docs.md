## Commands

### Name

Name defines what will trigger the command.

### Ping

Setting ping to true will prepend the username of the command invoker in the message the command returns to chat.

### Description

Quick description of the command, this will be used in the help command
and will be shown on the website

### Permission

What permission the user requires in the channel to run the command.

```typescript
Permission = PermissionLevel.VIEWER;
Permission = PermissionLevel.VIP;
Permission = PermissionLevel.MOD;
Permission = PermissionLevel.BROADCASTER;
Permission = PermissionLevel.ADMIN;
```

### OnlyOffline

If the command is allowed to only be run while the streamer is offline.

### Aliases

Other words which can trigger the command
Defining aliases in the command file at `Aliases`

```typescript
Aliases = [
    "foo",
    "bar"
],
```

So if the command is called `baz`, both `foo` and `bar` would trigger the `baz` command.

### Parameters

A parameter is used to give specific data to the command
A parameter can be given by doing `<prefix> <command> --foo <data>`
If a parameter is given which the command supports it will be shown inside the Data variable passed into the execution code

Parameters also support using the first character of the parameter as a prefix, so `--foo <data>` can also be written as `-f <data>`

<b>Important</b>

Don't have two parameters with the first character, this will cause one of them to be overwritten.

```typescript
data.Params: [key: string]
```

```typescript
Params = [
    [ArgType.String, 'foo'],
    [ArgType.Boolean, 'bar']
],
```

### Flags

For example if the command does not want to get checked against the banphrase, if we know that it won't use any user input
or if it will show a static url.
`Flags = [CommandFlags.NO_BANPHRASE];`
