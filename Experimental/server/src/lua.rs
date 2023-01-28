use rlua::Lua;

use crate::{
    error::Errors,
    types::{Channel, User},
};

static LUA_SCRIPTS: &'static [&'static str] = &[include_str!("../scripts/readonly.lua")];

fn load_lua_script(lua: &Lua, script: &'static str) -> Result<(), rlua::Error> {
    lua.context(|ctx| {
        ctx.load(&script).exec()?;

        Ok(())
    })?;

    Ok(())
}

fn wrap_as_readonly<'lua, Val>(
    ctx: &rlua::Context<'lua>,
    key: &str,
    value: Val,
) -> Result<(), rlua::Error>
where
    Val: rlua::ToLuaMulti<'lua>,
{
    let globals = ctx.globals();

    // key = MakeReadOnly(value)
    // globals[key] = value
    let readonly = globals
        .get::<_, rlua::Function>("MakeReadOnly")?
        .call::<Val, rlua::Table>(value)?;

    globals.set(key, readonly)?;

    Ok(())
}

fn remove_table<'lua, Val>(ctx: &rlua::Context<'lua>, key: &str) -> Result<(), rlua::Error>
where
    Val: rlua::ToLuaMulti<'lua>,
{
    let globals = ctx.globals();

    globals.set(key, rlua::Value::Nil)?;

    Ok(())
}

pub fn create_lua_ctx(channel: Channel, user: User) -> Result<rlua::Lua, rlua::Error> {
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

        wrap_as_readonly(&ctx, "channel", channel)?;
        wrap_as_readonly(&ctx, "user", user)?;

        remove_table::<rlua::Value>(&ctx, "os")?;
        remove_table::<rlua::Value>(&ctx, "io")?;

        Ok(())
    })?;

    Ok(state)
}

pub fn eval(lua: &rlua::Lua, command: &str) -> Result<String, Errors> {
    let result: String = lua.context(|ctx| {
        let result = ctx.load(command).eval::<rlua::Value>()?;

        Ok::<String, Errors>(stringify(result)?)
    })?;

    Ok(result)
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
        rlua::Value::Error(_) => Ok("Error".to_string()),
        rlua::Value::UserData(_) => Ok("UserData".to_string()),
    };
}

pub fn stringify_table(table: rlua::Table) -> Result<String, Errors> {
    let mut result = "Table:".to_string();

    // TODO How to make this a reference?
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
        let lua = rlua::Lua::new();

        load_lua_script(&lua, LUA_SCRIPTS[0]).unwrap();

        let res: Result<(), rlua::Error> = lua.context(|ctx| {
            wrap_as_readonly(&ctx, "readonly", ctx.create_table()?)?;

            let readonly = ctx.globals().get::<_, rlua::Table>("readonly")?;

            readonly.set("foo", "bar")?;

            Ok(())
        });

        assert!(res.is_err());
    }

    struct UserDataTest(u32);

    impl rlua::UserData for UserDataTest {
        fn add_methods<'lua, T: rlua::UserDataMethods<'lua, Self>>(methods: &mut T) {
            methods.add_method("foo", |_, this, ()| Ok(this.0));
        }
    }

    #[test]
    #[should_panic]
    fn test_readonly_userdata() {
        let lua = rlua::Lua::new();

        load_lua_script(&lua, LUA_SCRIPTS[0]).unwrap();

        lua.context(|ctx| {
            wrap_as_readonly(&ctx, "readonly", UserDataTest(32))?;

            // get readonly table
            let readonly = ctx.globals().get::<_, rlua::Table>("readonly")?;

            // set key
            readonly.set("foo", "bar")?;

            Ok::<(), rlua::Error>(())
        })
        .unwrap()
    }

    #[test]
    fn test_readonly_userdata_can_access() {
        let lua = rlua::Lua::new();

        load_lua_script(&lua, LUA_SCRIPTS[0]).unwrap();

        let res: Result<u32, rlua::Error> = lua.context(|ctx| {
            wrap_as_readonly(&ctx, "readonly", UserDataTest(32)).unwrap();

            let res = ctx.load("return readonly.get:foo()").eval::<u32>().unwrap();

            Ok(res)
        });

        assert_eq!(res.unwrap(), 32);
    }

    #[test]
    fn test_stringify() {
        let lua = rlua::Lua::new();

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

    #[test]
    fn test_os_io_removed() {
        let lua = create_lua_ctx(
            Channel("foo".to_string(), "foo".to_string()),
            User("foo".to_string(), "foo".to_string()),
        )
        .unwrap();

        lua.context(|ctx| {
            let os = ctx.globals().get::<_, rlua::Value>("os").unwrap();

            if let rlua::Value::Table(_) = os {
                panic!("os is a table")
            }

            let io = ctx.globals().get::<_, rlua::Value>("io").unwrap();

            if let rlua::Value::Table(_) = io {
                panic!("io is a table")
            }
        });
    }
}
