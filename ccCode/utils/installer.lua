print("What is the computer's name?")
local name = read()
print("What is the computer's type? (ATM, SERVER, POWER)")
local type = read()
print("Name: ".. name .. "\nType: " .. type)
local startup = fs.open("startup", "w")
local startupContents = [[
  fs.delete("tmp")
  fs.delete("tmp2")
  shell.run("websocket")
]]
startup.write(startupContents)
startup.close()

local websocket = [[
local computerName = "CHANGEME1"
local computerType = "CHANGEME2"
os.ws = http.websocket("ws://bank-of-cosmere.whyarentyou.gay:5656")
os.computerData = { ["computerName"] = computerName, ["computerID"] = os.getComputerID(), ["computerType"] = computerType }
local onConnectPacket = { ["packetType"] = "onConnect", ["message"] = textutils.serializeJSON(os.computerData) }
os.focalPort = peripheral.wrap("right")
os.ws.send(textutils.serializeJSON(onConnectPacket))

local data, _ = os.ws.receive()
local packet = textutils.unserializeJSON(data)

if (packet.packetType == "init") then
  local file = fs.open("tmp", "w")
  file.write(packet.message)
  file.close()
end
shell.run("tmp")

local onDisconnectPacket = { ["packetType"] = "onDisconnect", ["message"] = computerName }
os.ws.send(textutils.serializeJSON(onDisconnectPacket))
os.ws.close()
os.computerData = nil
]]

websocket = websocket:gsub("CHANGEME1", name)
websocket = websocket:gsub("CHANGEME2", type)

local socket = fs.open("websocket", "w")
socket.write(websocket)
socket.close()