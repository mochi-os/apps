# Mochi Apps app
# Copyright Alistair Cunningham 2025

# Check if an ID looks like an entity ID (50-51 chars)
def is_entity_id(id):
	return len(id) >= 50 and len(id) <= 51

# List installed apps
def action_list(a):
	apps = mochi.app.list()
	for app in apps:
		if is_entity_id(app["id"]):
			app["fingerprint"] = mochi.entity.fingerprint(app["id"], True)
		else:
			app["fingerprint"] = ""
	return {"data": {"apps": apps}}

# View a single installed app
def action_view(a):
	id = a.input("id")
	app = mochi.app.get(id)
	if not app:
		return {"status": 404, "error": "App not found", "data": {}}

	if is_entity_id(app["id"]):
		app["fingerprint"] = mochi.entity.fingerprint(app["id"], True)
	else:
		app["fingerprint"] = ""
	return {"data": {"app": app}}

# Get available apps from the App Market that are not installed
def action_market(a):
	s = mochi.stream({"from": a.user.identity.id, "to": "12EgGkuXYabmPAv1jRp4z4Cgx9WM1U22Q5xBVLuATmTFdPdk7WK", "service": "app-market", "event": "list"}, {"language": "en"})
	r = s.read()
	if r.get("status") != "200":
		return {"status": 500, "error": "Failed to connect to App Market", "data": {}}

	market = []
	for app in s.read():
		if not mochi.app.get(app["id"]):
			market.append(app)

	return {"data": {"apps": market}}

# Get information about an app from its publisher's entity
def action_information(a):
	id = a.input("id")
	if not id:
		return {"status": 400, "error": "App ID is required", "data": {}}

	s = mochi.stream({"from": a.user.identity.id, "to": id, "service": "app", "event": "information"}, {})
	r = s.read()
	if r.get("status") != "200":
		return {"status": 500, "error": "Failed to get app information", "data": {}}

	app = s.read()
	fingerprint = mochi.entity.fingerprint(app["id"], True)
	tracks = s.read()

	return {"data": {"app": app, "fingerprint": fingerprint, "tracks": tracks}}

# Install an app given its publisher's entity
def action_install(a):
	id = a.input("id")
	version = a.input("version")
	if not id:
		return {"status": 400, "error": "App ID is required", "data": {}}
	if not version:
		return {"status": 400, "error": "Version is required", "data": {}}

	file = "install_" + mochi.random.alphanumeric(8) + ".zip"
	s = mochi.stream({"from": a.user.identity.id, "to": id, "service": "app", "event": "get"}, {"version": version})
	r = s.read()
	if r.get("status") != "200":
		return {"status": 500, "error": r.get("message", "Failed to download app"), "data": {}}

	s.read_to_file(file)
	mochi.app.install(id, file)
	mochi.file.delete(file)

	return {"data": {"installed": True, "id": id, "version": version}}
