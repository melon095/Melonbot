---@type Command[]
Commands = {}

function DoRegisterCommand(command)
    table.insert(Commands, command)
end

function GetCommandByName(name)
    for _, command in ipairs(Commands) do
        if command:name() == name then
            return command
        end
    end
    
    return nil
end
