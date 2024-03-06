local function handlePacket(packet)
	if (packet.packetType == "broadcast") then
		print("Broadcast Message: " .. packet.message)
		return false
	end
	if (packet.packetType == "getDM") then
		print("Direct Message: " .. packet.message)
		return false
	end
	if (packet.packetType == "run") then
		local f = fs.open("tmp2")
		f.write(packet.message)
		f.close()
		shell.run("tmp2")
	end
	print("Unknown Packet Type: " .. packet.packetType)
end

local function tickServer()
	sleep(0)
	local data, wasBinary = os.ws.receive()
	local deserialized = textutils.unserializeJSON(data)
	local shouldBreak = handlePacket(deserialized)
end

local function runServer()
	while true do
		pcall(tickServer)
	end
end

local function waitForTerminate()
	while true do
		local event = os.pullEventRaw()
		if event == "terminate" then
			print("Terminating safely!");
			fs.delete("tmp")
			fs.delete("tmp.lua")
			fs.delete("tmp2")
			fs.delete("tmp2.lua")
            os.shutdown()
            break;
		end
	end
end

print("Your client type is unidentified! If this is a dev computer disregaurd this message.")
parallel.waitForAny(runServer, waitForTerminate)
