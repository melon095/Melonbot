pub mod cleanup;

use std::fs;

use rlua::Lua;

use crate::error::Errors;

// TODO: Can keep scripts in binary for now, but move to reading during runtime if needed.
static LUA_SCRIPTS: &'static [&'static str] = &[
    include_str!("../../scripts/lib.lua"),
    include_str!("../../scripts/readonly.lua"),
];

fn load_lua_script(lua: &Lua, script: &'static str) -> Result<(), rlua::Error> {
    lua.context(|ctx| {
        ctx.load(&script).set_name("Load Lua Script")?.exec()?;

        Ok(())
    })?;

    Ok(())
}

/// Creates a global variable in Lua that is readonly.
pub fn wrap_as_readonly<'lua, Val>(
    ctx: &rlua::Context<'lua>,
    key: &str,
    value: Val,
) -> Result<(), rlua::Error>
where
    Val: rlua::ToLuaMulti<'lua>,
{
    let globals = ctx.globals();

    let readonly = globals
        .get::<_, rlua::Function>("MakeReadOnly")?
        .call::<_, rlua::Value>(value)?;

    globals.set(key, readonly)?;

    Ok(())
}

/// Reads every command in scripts/commands
///
/// Each command calls a DoRegisterCommand function that registers the command in a global table.
///
/// We can then call the command by calling the function in the table.
pub fn load_commands<'lua>(lua: &rlua::Lua) -> Result<i64, rlua::Error> {
    let mut count = 0;

    lua.context(|ctx| {
        let dir = match fs::read_dir("./scripts/commands/") {
            Ok(dir) => dir,
            Err(e) => {
                log::error!("Error reading directory: {}", e);
                return Ok(());
            }
        };

        for entry in dir {
            let entry = match entry {
                Ok(entry) => entry,
                Err(e) => {
                    log::error!("Error reading directory: {}", e);
                    continue;
                }
            };

            let path = entry.path();

            if path.is_file() {
                let script = match fs::read_to_string(path) {
                    Ok(script) => script,
                    Err(e) => {
                        log::error!("Error reading file: {}", e);
                        continue;
                    }
                };

                ctx.load(&script)
                    .set_name(&format!("Load Command {:?}", entry.file_name()))?
                    .eval()?;
            }
        }

        let commands_table = ctx.globals().get::<_, rlua::Table>("Commands")?;

        count = commands_table.len()? as i64;
        Ok(())
    })?;

    Ok(count)
}

pub fn create_lua_ctx() -> Result<rlua::Lua, rlua::Error> {
    let state = rlua::Lua::new();

    for script in LUA_SCRIPTS {
        load_lua_script(&state, script)?;
    }

    state.context(|ctx| {
        ctx.globals().set(
            "print",
            ctx.create_function(|_, val: rlua::Value| {
                let s = match stringify(val) {
                    Ok(s) => s,
                    Err(e) => e.to_string(),
                };

                log::info!("[Lua]: {}", s);
                Ok(())
            })?,
        )?;

        ctx.globals().set(
            "stringify",
            ctx.create_function(|_, val: rlua::Value| {
                let s = match stringify(val) {
                    Ok(s) => s,
                    Err(e) => e.to_string(),
                };

                Ok(s)
            })?,
        )?;

        cleanup::cleanup_bad_globals(&ctx)?;

        Ok(())
    })?;

    Ok(state)
}

pub fn stringify(value: rlua::Value) -> Result<String, Errors> {
    return match value {
        rlua::Value::String(s) => Ok(s.to_str()?.to_string()),
        rlua::Value::Integer(i) => Ok(i.to_string()),
        rlua::Value::Boolean(b) => Ok(b.to_string()),
        rlua::Value::LightUserData(_) => Ok("LightUserData".to_string()),
        rlua::Value::Number(n) => Ok(n.to_string()),
        rlua::Value::Table(t) => Ok(stringify_table(t)?),
        rlua::Value::Function(_) => Ok("Function".to_string()),
        rlua::Value::Thread(_) => Ok("Thread".to_string()),
        rlua::Value::Nil => Ok("Nil".to_string()),
        rlua::Value::Error(error) => Ok(error.to_string()),
        rlua::Value::UserData(_) => Ok("UserData".to_string()),
    };
}

pub fn stringify_table(table: rlua::Table) -> Result<String, Errors> {
    let mut result = "Table:".to_string();

    for pair in table.pairs::<rlua::Value, rlua::Value>() {
        result.push(' ');

        let (key, value) = pair?;

        result.push_str(&format!("{}: {}", stringify(key)?, stringify(value)?));
    }

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_readonly_table() {
        let lua = create_lua_ctx().unwrap();

        let res: Result<(), rlua::Error> = lua.context(|ctx| {
            wrap_as_readonly(&ctx, "readonly", ctx.create_table()?)?;

            let readonly = ctx.globals().get::<_, rlua::Table>("readonly")?;

            readonly.set("foo", "bar")?;

            Ok(())
        });

        assert!(res.is_err());

        match res {
            Err(rlua::Error::RuntimeError(e)) => {}
            Err(e) => panic!("Unexpected error: {}", e),
            _ => panic!("Unexpected result"),
        }
    }

    struct UserDataTest(u32);

    impl rlua::UserData for UserDataTest {
        fn add_methods<'lua, T: rlua::UserDataMethods<'lua, Self>>(methods: &mut T) {
            methods.add_method("foo", |_, this, ()| Ok(this.0));
        }
    }

    #[test]
    fn test_readonly_userdata() {
        let lua = create_lua_ctx().unwrap();

        // let data = UserDataTest(32);

        let result = lua.context(|ctx| {
            wrap_as_readonly(&ctx, "readonly", ctx.create_table()?)?;

            // get readonly table
            let readonly = ctx.globals().get::<_, rlua::Table>("readonly")?;

            // set key
            readonly.set("foo", "bar")?;

            Ok::<(), rlua::Error>(())
        });

        assert!(result.is_err());

        match result {
            Err(rlua::Error::RuntimeError(_)) => {}
            Err(e) => panic!("Unexpected error: {}", e),
            _ => panic!("Unexpected result"),
        }
    }

    #[test]
    fn test_readonly_not_string() {
        let lua = create_lua_ctx().unwrap();

        let result = lua.context(|ctx| {
            wrap_as_readonly(&ctx, "foo", ctx.create_string("foo")?)?;

            Ok::<(), rlua::Error>(())
        });

        assert!(result.is_err());

        match result {
            Err(rlua::Error::RuntimeError(e)) => {}
            Err(e) => panic!("Unexpected error: {}", e),
            _ => panic!("Unexpected result"),
        }
    }

    #[test]
    fn test_readonly_userdata_can_access() {
        let lua = create_lua_ctx().unwrap();

        let res: Result<u32, rlua::Error> = lua.context(|ctx| {
            wrap_as_readonly(&ctx, "readonly", UserDataTest(32)).unwrap();

            let res = ctx.load("return readonly.get:foo()").eval::<u32>().unwrap();

            Ok(res)
        });

        assert_eq!(res.unwrap(), 32);
    }

    #[test]
    fn test_stringify() {
        let lua = create_lua_ctx().unwrap();

        let res: Result<String, Errors> = lua.context(|ctx| {
            let res = stringify(rlua::Value::Table(ctx.create_table()?))?;

            Ok(res)
        });

        assert_eq!(res.unwrap(), "Table:");

        let res: Result<String, Errors> = lua.context(|ctx| {
            let res = stringify(rlua::Value::String(ctx.create_string("foo")?))?;

            Ok(res)
        });

        assert_eq!(res.unwrap(), "foo");

        let res: Result<String, Errors> = lua.context(|ctx| {
            let table = ctx.create_table()?;

            table.set("foo", "bar")?;

            let res = stringify(rlua::Value::Table(table))?;

            Ok(res)
        });

        assert_eq!(res.unwrap(), "Table: foo: bar");

        let res: Result<String, Errors> = lua.context(|ctx| {
            let table = ctx.create_table()?;

            table.set("foo", "bar")?;
            table.set("bar", "bar")?;

            let res = stringify(rlua::Value::Table(table))?;

            Ok(res)
        });

        // TODO: This is not guaranteed to be in order
        assert_eq!(res.unwrap().len(), "Table: foo: bar foo: bar".len());
    }
}
