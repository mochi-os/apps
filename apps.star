# Mochi Apps app
# Copyright Alistair Cunningham 2025

# Check if an ID looks like an entity ID (50-51 chars)
def is_entity_id(id):
	return len(id) >= 50 and len(id) <= 51

# List installed apps (only Starlark apps)
def action_list(a):
	all_apps = mochi.app.list()
	installed = []
	development = []
	for app in all_apps:
		if app.get("engine") != "starlark":
			continue
		if is_entity_id(app["id"]):
			app["fingerprint"] = mochi.entity.fingerprint(app["id"], True)
			installed.append(app)
		else:
			app["fingerprint"] = ""
			development.append(app)

	# Check if user can install apps
	can_install = a.user.role == "administrator" or mochi.setting.get("apps_install_user") == "true"

	return {"data": {"installed": installed, "development": development, "can_install": can_install}}

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
	s = mochi.remote.stream("1JYmMpQU7fxvTrwHpNpiwKCgUg3odWqX7s9t1cLswSMAro5M2P", "app-market", "list", {"language": "en"})
	if not s:
		return {"status": 500, "error": "Failed to connect to App Market", "data": {}}
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
	if len(id) > 51:
		return {"status": 400, "error": "Invalid app ID", "data": {}}

	s = mochi.remote.stream(id, "publisher", "information", {})
	if not s:
		return {"status": 500, "error": "Failed to connect to publisher", "data": {}}
	r = s.read()
	if r.get("status") != "200":
		return {"status": 500, "error": "Failed to get app information", "data": {}}

	app = s.read()
	fingerprint = mochi.entity.fingerprint(app["id"], True)
	tracks = s.read()

	return {"data": {"app": app, "fingerprint": fingerprint, "tracks": tracks}}

# Install an app from a publisher entity
def action_install_publisher(a):
	# Check if user is allowed to install apps
	if a.user.role != "administrator":
		if mochi.setting.get("apps_install_user") != "true":
			return {"status": 403, "error": "App installation is restricted to administrators", "data": {}}

	id = a.input("id")
	version = a.input("version")
	if not id:
		return {"status": 400, "error": "App ID is required", "data": {}}
	if len(id) > 51:
		return {"status": 400, "error": "Invalid app ID", "data": {}}
	if not version:
		return {"status": 400, "error": "Version is required", "data": {}}
	if not mochi.valid(version, "version"):
		return {"status": 400, "error": "Invalid version format", "data": {}}

	file = "install_" + mochi.random.alphanumeric(8) + ".zip"
	s = mochi.remote.stream(id, "publisher", "get", {"version": version})
	if not s:
		return {"status": 500, "error": "Failed to connect to publisher", "data": {}}
	r = s.read()
	if r.get("status") != "200":
		return {"status": 500, "error": r.get("message", "Failed to download app"), "data": {}}

	s.read_to_file(file)
	mochi.app.file.install(id, file)
	mochi.file.delete(file)

	return {"data": {"installed": True, "id": id, "version": version}}

# Install an app from an uploaded zip file
def action_install_file(a):
	# Only administrators can install apps from files
	if a.user.role != "administrator":
		return {"status": 403, "error": "App installation is restricted to administrators", "data": {}}

	file = a.input("file")
	if not file:
		return {"status": 400, "error": "No file provided", "data": {}}
	if not mochi.valid(file, "filename"):
		return {"status": 400, "error": "Invalid filename", "data": {}}
	if not file.endswith(".zip"):
		return {"status": 400, "error": "File must be a .zip archive", "data": {}}

	privacy = a.input("privacy", "private")
	if privacy != "public" and privacy != "private":
		return {"status": 400, "error": "Privacy must be 'public' or 'private'", "data": {}}

	# Save uploaded file
	a.upload("file", file)

	# Get app info from the zip file
	info = mochi.app.file.get(file)
	if not info:
		mochi.file.delete(file)
		return {"status": 400, "error": "Failed to read app info from archive", "data": {}}

	# Create an entity for this app using the name from the archive
	entity = mochi.entity.create("app", info["name"], privacy)
	if not entity:
		mochi.file.delete(file)
		return {"status": 500, "error": "Failed to create app entity", "data": {}}

	# Install the app
	version = mochi.app.file.install(entity, file)
	mochi.file.delete(file)

	return {"data": {"installed": True, "id": entity, "version": version}}
