---@class TestCommand : Command
local TestCommand = {}

function TestCommand:name()
    return "test"
end

function TestCommand:help()
    return "This is a test command"
end

---@param args string[]
function TestCommand:execute(args)
    for i = 1, 4 do
        Channel.get:reply("FeelsDankMan " .. i)
    end
end

DoRegisterCommand(TestCommand)