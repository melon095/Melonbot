pub mod cleanup;

use std::fs;

use mlua::Lua;

use crate::{
    error::Errors,
    state::State,
    types::{Channel, Invoker},
};

// TODO: Can keep scripts in binary for now, but move to reading during runtime if needed.
static LUA_SCRIPTS: &'static [&'static str] = &[
    include_str!("../../scripts/lib.lua"),
    include_str!("../../scripts/readonly.lua"),
];

fn load_lua_script(lua: &Lua, script: &'static str) -> Result<(), mlua::Error> {
    lua.load(script).set_name("Load Lua Script")?.exec()?;

    Ok(())
}

/// Creates a global variable in Lua that is readonly.
pub fn wrap_as_readonly<'lua, Val>(
    lua: &'lua mlua::Lua,
    key: &str,
    value: Val,
) -> Result<(), mlua::Error>
where
    Val: mlua::ToLuaMulti<'lua>,
{
    let globals = lua.globals();

    let readonly = globals
        .get::<_, mlua::Function>("MakeReadOnly")?
        .call::<_, mlua::Value>(value)?;

    globals.set(key, readonly)?;

    Ok(())
}

/// Loads a lua state with pre-loaded commands.
pub fn load_ready_lua_state<'lua>(channel: Channel, invoker: Invoker) -> Result<State, Errors> {
    let lua = create_lua_ctx()?;

    let state = State::new(lua, channel, invoker)?;

    let count = load_commands(&state.lua)?;

    log::info!("Loaded {} commands", count);

    Ok(state)
}

/// Reads every command in scripts/commands
///
/// Each command calls a DoRegisterCommand function that registers the command in a global table.
///
/// We can then call the command by calling the function in the table.
pub fn load_commands<'lua>(lua: &mlua::Lua) -> Result<i64, mlua::Error> {
    let dir = match fs::read_dir("./scripts/commands/") {
        Ok(dir) => dir,
        Err(e) => {
            log::error!("Error reading directory: {}", e);
            return Ok(0);
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

            lua.load(&script)
                .set_name(&format!("Load Command {:?}", entry.file_name()))?
                .eval()?;
        }
    }

    let commands_table = lua.globals().get::<_, mlua::Table>("Commands")?;

    Ok(commands_table.len()? as i64)
}

pub fn create_lua_ctx() -> Result<mlua::Lua, mlua::Error> {
    let lua = mlua::Lua::new();

    for script in LUA_SCRIPTS {
        load_lua_script(&lua, script)?;
    }

    let globals = lua.globals();

    globals.set(
        "print",
        lua.create_function(|_, val: mlua::Value| {
            let s = match stringify(val) {
                Ok(s) => s,
                Err(e) => e.to_string(),
            };

            log::info!("[Lua]: {}", s);
            Ok(())
        })?,
    )?;

    globals.set(
        "stringify",
        lua.create_function(|_, val: mlua::Value| {
            let s = match stringify(val) {
                Ok(s) => s,
                Err(e) => e.to_string(),
            };

            Ok(s)
        })?,
    )?;
    drop(globals);

    cleanup::cleanup_bad_globals(&lua)?;

    Ok(lua)
}

pub fn stringify(value: mlua::Value) -> Result<String, Errors> {
    return match value {
        mlua::Value::String(s) => Ok(s.to_str()?.to_string()),
        mlua::Value::Integer(i) => Ok(i.to_string()),
        mlua::Value::Boolean(b) => Ok(b.to_string()),
        mlua::Value::LightUserData(_) => Ok("LightUserData".to_string()),
        mlua::Value::Number(n) => Ok(n.to_string()),
        mlua::Value::Table(t) => Ok(stringify_table(t)?),
        mlua::Value::Function(_) => Ok("Function".to_string()),
        mlua::Value::Thread(_) => Ok("Thread".to_string()),
        mlua::Value::Nil => Ok("Nil".to_string()),
        mlua::Value::Error(error) => Ok(error.to_string()),
        mlua::Value::UserData(_) => Ok("UserData".to_string()),
    };
}

pub fn stringify_table(table: mlua::Table) -> Result<String, Errors> {
    let mut result = "Table:".to_string();

    for pair in table.pairs::<mlua::Value, mlua::Value>() {
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

        assert!(wrap_as_readonly(&lua, "readonly", lua.create_table().unwrap()).is_ok());

        let readonly = lua.globals().get::<_, mlua::Table>("readonly").unwrap();

        let res = readonly.set("foo", "bar");

        assert!(res.is_err());

        match res {
            Err(mlua::Error::RuntimeError(_)) => {}
            Err(e) => panic!("Unexpected error: {}", e),
            _ => panic!("Unexpected result"),
        }
    }

    struct UserDataTest(u32);

    impl mlua::UserData for UserDataTest {
        fn add_methods<'lua, T: mlua::UserDataMethods<'lua, Self>>(methods: &mut T) {
            methods.add_method("foo", |_, this, ()| Ok(this.0));
        }
    }

    #[test]
    fn test_readonly_userdata() {
        let lua = create_lua_ctx().unwrap();

        // let data = UserDataTest(32);

        wrap_as_readonly(&lua, "readonly", lua.create_table().unwrap()).unwrap();

        // get readonly table
        let readonly = lua.globals().get::<_, mlua::Table>("readonly").unwrap();

        // set key
        let result = readonly.set("foo", "bar");

        assert!(result.is_err());

        match result {
            Err(mlua::Error::RuntimeError(_)) => {}
            Err(e) => panic!("Unexpected error: {}", e),
            _ => panic!("Unexpected result"),
        }
    }

    #[test]
    fn test_readonly_not_string() {
        let lua = create_lua_ctx().unwrap();

        let result = wrap_as_readonly(&lua, "foo", lua.create_string("foo").unwrap());

        assert!(result.is_err());

        match result {
            Err(mlua::Error::RuntimeError(_)) => {}
            Err(e) => panic!("Unexpected error: {}", e),
            _ => panic!("Unexpected result"),
        }
    }

    #[test]
    fn test_readonly_userdata_can_access() {
        let lua = create_lua_ctx().unwrap();

        assert!(wrap_as_readonly(&lua, "readonly", UserDataTest(32)).is_ok());

        let res = lua.load("return readonly.get:foo()").eval::<u32>();

        assert_eq!(res.unwrap(), 32);
    }

    #[test]
    fn test_stringify() {
        let lua = create_lua_ctx().unwrap();

        let res = stringify(mlua::Value::Table(lua.create_table().unwrap()));

        assert_eq!(res.unwrap(), "Table:");

        let res = stringify(mlua::Value::String(lua.create_string("foo").unwrap()));

        assert_eq!(res.unwrap(), "foo");

        let table = lua.create_table().unwrap();

        table.set("foo", "bar").unwrap();

        let res = stringify(mlua::Value::Table(table));

        assert_eq!(res.unwrap(), "Table: foo: bar");

        let table = lua.create_table().unwrap();

        table.set("foo", "bar").unwrap();
        table.set("bar", "bar").unwrap();

        let res = stringify(mlua::Value::Table(table));

        // TODO: This is not guaranteed to be in order
        assert_eq!(res.unwrap().len(), "Table: foo: bar foo: bar".len());
    }
}
