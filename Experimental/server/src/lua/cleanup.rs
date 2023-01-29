static BAD_GLOBAL_VALUES: &'static [&'static str] = &[
    // "os",
    "io",
    "debug",
    "require",
    "package",
    "dofile",
    "load",
    "loadstring",
    "loadfile",
    "collectgarbage",
    "getfenv",
    "setfenv",
];

static BAD_OS_VALUES: &'static [&'static str] = &[
    "execute",
    "exit",
    "getenv",
    "remove",
    "rename",
    "setlocale",
    "tmpname",
];

pub fn remove_global_variable<'lua, Val>(
    global_table: &mlua::Table<'lua>,
    key: &str,
) -> Result<(), mlua::Error>
where
    Val: mlua::ToLuaMulti<'lua>,
{
    global_table.set(key, mlua::Nil)?;

    Ok(())
}

pub fn cleanup_bad_globals<'lua>(lua: &mlua::Lua) -> Result<(), mlua::Error> {
    let global_table = lua.globals();

    for value in BAD_GLOBAL_VALUES {
        remove_global_variable::<mlua::Table>(&global_table, value)?;
    }

    let os = lua.globals().get::<_, mlua::Table>("os")?;

    for value in BAD_OS_VALUES {
        remove_global_variable::<mlua::Table>(&os, value)?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::lua::create_lua_ctx;

    struct UserDataTest(u32);

    impl mlua::UserData for UserDataTest {
        fn add_methods<'lua, T: mlua::UserDataMethods<'lua, Self>>(methods: &mut T) {
            methods.add_method("foo", |_, this, ()| Ok(this.0));
        }
    }

    #[test]
    fn test_bad_functions_removed() {
        let lua = create_lua_ctx().unwrap();

        let io = lua.globals().get::<_, mlua::Value>("io").unwrap();

        if let mlua::Value::Table(_) = io {
            panic!("io is a table")
        }

        let require = lua.globals().get::<_, mlua::Value>("require").unwrap();

        if let mlua::Value::Function(_) = require {
            panic!("require is a function")
        }

        let loadfile = lua.globals().get::<_, mlua::Value>("loadfile").unwrap();

        if let mlua::Value::Function(_) = loadfile {
            panic!("loadfile is a function")
        }

        let load = lua.globals().get::<_, mlua::Value>("load").unwrap();

        if let mlua::Value::Function(_) = load {
            panic!("load is a function")
        }

        let dofile = lua.globals().get::<_, mlua::Value>("dofile").unwrap();

        if let mlua::Value::Function(_) = dofile {
            panic!("dofile is a function")
        }

        let _ = lua.load("require('os')").eval::<mlua::Value>().unwrap_err();
        let _ = lua.load("require('io')").eval::<mlua::Value>().unwrap_err();
        let _ = lua
            .load("require('loadfile')")
            .eval::<mlua::Value>()
            .unwrap_err();
        let _ = lua
            .load("require('load')")
            .eval::<mlua::Value>()
            .unwrap_err();
        let _ = lua
            .load("require('dofile')")
            .eval::<mlua::Value>()
            .unwrap_err();

        let os = lua.globals().get::<_, mlua::Table>("os").unwrap();
        let _ = os.get::<_, mlua::Function>("execute").unwrap_err();
        let _ = os.get::<_, mlua::Function>("exit").unwrap_err();
        let _ = os.get::<_, mlua::Function>("clock").unwrap();
    }
}
