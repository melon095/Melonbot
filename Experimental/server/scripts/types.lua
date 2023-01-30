---@meta

---@class ChannelUserDataGet
---@field id fun() string The channel's ID
---@field name fun() string The channel's name
---@field reply fun(self: ChannelUserDataGet, message: string) void Replies to the invoker

---@class ChannelUserData
---@field get ChannelUserDataGet

---@class InvokerUserDataGet
---@field id fun() string The invoker's ID
---@field name fun() string The invoker's name

---@class InvokerUserData
---@field get InvokerUserDataGet

---@class Command
---@field name function() string The command's name
---@field help function() string The command's help text
---@field execute fun(args: string[]) string The command's execution function

---@type ChannelUserData
Channel = {}

---@type InvokerUserData
Invoker = {}