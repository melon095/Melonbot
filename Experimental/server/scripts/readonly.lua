function MakeReadOnly(value)
    local val_t = type(value)

    if val_t ~= "table" and val_t ~= "userdata" then
        error("Attempt to make non-table read-only", 2)
    end

    if val_t == "table" then
        setmetatable(value, {__newindex = function ()
            error("Attempt to modify read-only table", 2)
        end})

        for _, value in pairs(value) do
            if type(value) == "table" then
                MakeReadOnly(value)
            end
        end
        return value
        -- Dumb hack. Figure out how to get userdata by invoking root 
    elseif val_t =="userdata" then
        local wrapper = {
            get = value
        }

        return setmetatable(wrapper, {__index = value, __newindex = function ()
            error("Attempt to modify read-only userdata", 2)
        end})
    end
end