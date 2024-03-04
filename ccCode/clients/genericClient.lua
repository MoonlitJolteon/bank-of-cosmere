-- START BUTTON CODE --
local _locales = {
	mon = nil
}

--button class
function create(text)
	local this = {
		x = 1,
		y = 1,
		w = 0,
		h = 1,
		text = tostring(text) or "None",
		bgcol = colors.lime,
		blinkCol = colors.red,
		align = "c",
		active = true,
		callback = nil,
		ret = nil,
		textColor = colors.black
	}
  
	if text ~= nil then
		this.w = #tostring(text)
	end
  
	--setters, return this object
	function this.setText(text, resize)
		this.text = tostring(text)
		if resize and this.w < #this.text then
			this.w = #this.text
		end
		return this
	end
  
	function this.setTextColor(color)
		this.textColor = color
		return this
	end
  
	function this.setAlign(align)
		if align == "center" then
			this.align = "c"
		elseif align == "left" then
			this.align = "l"
		elseif align == "right" then
			this.align = "r"
		else 
			print("Incorrect slign set! ")
			error()
		end
		return this
	end
  
	function this.setPos(x, y)
		this.x = x
		this.y = y
		return this
	end
  
	function this.setSize(w, h)
		this.w = w
		this.h = h
		return this
	end
  
	function this.setColor(color)
		this.bgcol = color
		return this
	end
  
	function this.setBlinkColor(color)
		this.blinkCol = color
		return this
	end
  
	function this.setActive(state)
		this.active = state
		return this
	end
  
	function this.wasClicked(x,y)
		if 
			x >= this.x and
			x < this.x+this.w and
			y >= this.y and
			y < this.y+this.h and
			this.active
		then
			return true
		end
		return false
	end
  
	function this.onClick(callback)
		this.callback = callback
		return this
	end
  
	function this.onClickReturn(value)
		this.ret = value
		return this
	end
  
	function this.fireEvent()
		if this.callback ~= nil then
			this.callback()
		end
	end
  
	function this.drawWrapper(bgcol)
		if _locales.mon == nil then
			print("Monitor not set!")
			error()
		end
		local xpos = this.x+(this.w/2-#this.text/2)
		local t = this.text
		local bg = _locales.mon.getBackgroundColor()
		local tc = _locales.mon.getTextColor()
		if this.align == "l" then
			xpos = this.x
		end
		if this.align == "r" then
			xpos = this.x+this.w-#this.text
		end
		if #this.text > this.w then
			xpos = this.x
			t = string.sub(t,1,this.w-3)..".."..string.sub(t,-1)
		end
		_locales.mon.setTextColor(this.textColor)
		local f = string.rep(" ", this.w)
		if this.active then
			_locales.mon.setBackgroundColor(bgcol)
		else
			_locales.mon.setBackgroundColor(colors.gray)
		end
		for i = 1, this.h do
			_locales.mon.setCursorPos(this.x, this.y+(i-1))
			_locales.mon.write(f)
		end
		_locales.mon.setCursorPos(xpos,this.y+this.h/2)
		_locales.mon.write(t)
		_locales.mon.setBackgroundColor(bg)
		_locales.mon.setTextColor(tc)
	end
  
	function this.draw()
		this.drawWrapper(this.bgcol)
	end

	function this.blink()
		this.drawWrapper(this.blinkCol)
		sleep(0.2)
		this.draw()
	end

	return this
end

--set Monitor handle to draw on
function setMonitor(mon)
	_locales.mon = mon
	--MON = mon
end

function clearMon()
	_locales.mon.clear()
end

local function isTable(element)
	return type(element) == "table"
end

local function isButton(element)
	if isTable(element) and element.text ~= nil then
		return true
	end
	return false
end

local function mergeTables(tab1, tab2)
	for i in pairs(tab2) do
		tab1[#tab1+1] = tab2[i]
	end
end

--manage button checks
function await(...)
	array = {}
	for i in pairs(arg) do
		if i ~= "n" then
			if isTable(arg[i]) and not isButton(arg[i]) then --table of buttons
				mergeTables(array, arg[i])
			else --single button
				array[#array+1] = arg[i]
			end
		end
	end

	for i in pairs(array) do
			array[i].draw()
	end
	e, s, x, y = os.pullEvent("monitor_touch")
	for i in pairs(array) do
		if array[i].wasClicked(x,y) then
			array[i].blink()
			if array[i].ret ~= nil then
				return array[i].ret
			end
			array[i].fireEvent()
		end
	end
end
-- END BUTTON CODE --
-- START BANK CODE --
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
		local funcToRun = load(packet.message)
		pcall(funcToRun())
		return false
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

local function testButton()
	print("It worked!")
end

local file = fs.open("tmp2", "w")
file.write(buttonAPI)
file.close()
os.loadAPI("tmp2")

local monitor = peripheral.wrap("top")
setMonitor(monitor)
local buttonOne = create("Test")
buttonOne.setPos(1, 1)
buttonOne.onClick(testButton)

local function waitForButtons()
	while true do
		sleep(0)
		await(buttonOne)
	end
end
print("Your client type is unidentified! If this is a dev computer disregaurd this message.")
parallel.waitForAny(runServer, waitForTerminate, waitForButtons)
-- END BANK CODE --