function waitForTerminate()
    while true do
        local event = os.pullEventRaw()
        if event == "terminate" then
            print("Terminating safely!");
            fs.delete("tmp")
            fs.delete("tmp.lua")
            -- os.shutdown()
            break;
        end
    end
end

function run()
    while true do
        sleep(1)
        print("Hello, this is a loop to ensure connection was successful!")
    end
end

parallel.waitForAny(waitForTerminate, run)
