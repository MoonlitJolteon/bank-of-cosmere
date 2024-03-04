local cable = peripheral.wrap("bottom")
local output = peripheral.find("ultimateEnergyCube")
local totalUsage = 0
local usageLimit = 100000000
output.setRedstoneMode("DISABLED")
while true do
  shell.run("clear")
  local cap = cable.getCapacity()
  local buff = cable.getBuffer()
  local usagePerTick = cap - buff
  local usagePerSecond = usagePerTick * 20
  local usagePerMinute =  usagePerSecond * 60
  local usagePerHour = usagePerMinute * 60
  totalUsage = totalUsage + usagePerSecond
  print("Use/Sec: " .. usagePerSecond)
  print("Use/Min: " .. usagePerMinute)
  print("Use/Hour: " .. usagePerHour)
  print("Usage Left: " .. usageLimit - totalUsage)
  sleep(1)
  if(usageLimit - totalUsage) <= 0 then break end
end
output.setRedstoneMode("HIGH")