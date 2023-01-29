use mlua::chunk;

use crate::{
    error::Errors,
    lua::{cleanup, stringify, wrap_as_readonly},
    types::{Channel, Invoker, ListResponse},
};

/// State for one request
pub struct State {
    pub lua: mlua::Lua,
    pub channel: Channel,
    pub invoker: Invoker,
}

impl State {
    pub fn new(lua: mlua::Lua, channel: Channel, invoker: Invoker) -> Result<Self, mlua::Error> {
        Ok(Self {
            lua,
            channel,
            invoker,
        })
    }

    pub fn list_commands(&self) -> Result<ListResponse, Errors> {
        let script = chunk! {
            local names = {}

            for _, command in ipairs(Commands) do
                table.insert(names, command:name())
            end

            return names
        };

        let table: mlua::Table = self.lua.load(script).call(())?;

        let mut names = Vec::new();

        for i in 1..=table.len()? {
            let name = table.get::<_, String>(i)?;
            names.push(name);
        }

        Ok(ListResponse(names))
    }

    pub fn execute(self, command: &str, args: Vec<String>) -> Result<String, Errors> {
        let script = chunk! {
            local command = GetCommandByName($command)

            if command == nil then
                error("Command not found", 2)
            end

            return command
        };

        let command: mlua::Table = self.lua.load(script).call(())?;

        wrap_as_readonly(&self.lua, "Channel", self.channel)?;
        wrap_as_readonly(&self.lua, "Invoker", self.invoker)?;

        let name = command
            .get::<_, mlua::Function>("name")?
            .call::<_, String>(())?;

        log::info!("Executing command: {}", name);

        let response = command
            .get::<_, mlua::Function>("execute")?
            .call::<_, mlua::Value>(args /* TODO is nil on lua side */);

        match response {
            Ok(r) => stringify(r),
            Err(e) => {
                log::error!("Error executing command: {}", e);
                return Err(Errors::LuaError(e));
            }
        }
    }
}
