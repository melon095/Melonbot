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
    ctx: &rlua::Context<'lua>,
    key: &str,
) -> Result<(), rlua::Error>
where
    Val: rlua::ToLuaMulti<'lua>,
{
    let globals = ctx.globals();

    globals.set(key, rlua::Value::Nil)?;

    Ok(())
}

pub fn cleanup_bad_globals<'lua>(ctx: &rlua::Context<'lua>) -> Result<(), rlua::Error> {
    for value in BAD_GLOBAL_VALUES {
        remove_global_variable::<rlua::Value>(&ctx, value)?;
    }

    let os = ctx.globals().get::<_, rlua::Table>("os")?;

    for value in BAD_OS_VALUES {
        os.set(*value, rlua::Value::Nil)?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::lua::create_lua_ctx;

    struct UserDataTest(u32);

    impl rlua::UserData for UserDataTest {
        fn add_methods<'lua, T: rlua::UserDataMethods<'lua, Self>>(methods: &mut T) {
            methods.add_method("foo", |_, this, ()| Ok(this.0));
        }
    }

    #[test]
    fn test_bad_functions_removed() {
        let lua = create_lua_ctx().unwrap();

        lua.context(|ctx| {
            let io = ctx.globals().get::<_, rlua::Value>("io").unwrap();

            if let rlua::Value::Table(_) = io {
                panic!("io is a table")
            }

            let require = ctx.globals().get::<_, rlua::Value>("require").unwrap();

            if let rlua::Value::Function(_) = require {
                panic!("require is a function")
            }

            let loadfile = ctx.globals().get::<_, rlua::Value>("loadfile").unwrap();

            if let rlua::Value::Function(_) = loadfile {
                panic!("loadfile is a function")
            }

            let load = ctx.globals().get::<_, rlua::Value>("load").unwrap();

            if let rlua::Value::Function(_) = load {
                panic!("load is a function")
            }

            let dofile = ctx.globals().get::<_, rlua::Value>("dofile").unwrap();

            if let rlua::Value::Function(_) = dofile {
                panic!("dofile is a function")
            }

            let _ = ctx.load("require('os')").eval::<rlua::Value>().unwrap_err();
            let _ = ctx.load("require('io')").eval::<rlua::Value>().unwrap_err();
            let _ = ctx
                .load("require('loadfile')")
                .eval::<rlua::Value>()
                .unwrap_err();
            let _ = ctx
                .load("require('load')")
                .eval::<rlua::Value>()
                .unwrap_err();
            let _ = ctx
                .load("require('dofile')")
                .eval::<rlua::Value>()
                .unwrap_err();

            let os = ctx.globals().get::<_, rlua::Table>("os").unwrap();
            let _ = os.get::<_, rlua::Function>("execute").unwrap_err();
            let _ = os.get::<_, rlua::Function>("exit").unwrap_err();
            let _ = os.get::<_, rlua::Function>("clock").unwrap();
        });
    }
}
