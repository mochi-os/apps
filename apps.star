# Mochi Apps app
# Copyright Alistair Cunningham 2025

# Check if an ID looks like an entity ID (50-51 chars)
def is_entity_id(id):
	return len(id) >= 50 and len(id) <= 51

# Check if version v >= target. Handles both 0.3.0 and 1.0 formats.
def version_gte(v, target):
	v_parts = []
	for p in v.split("."):
		v_parts.append(int(p))
	t_parts = []
	for p in target.split("."):
		t_parts.append(int(p))
	# Pad shorter list with zeros for comparison
	while len(v_parts) < len(t_parts):
		v_parts.append(0)
	while len(t_parts) < len(v_parts):
		t_parts.append(0)
	# Compare element by element
	for i in range(len(v_parts)):
		if v_parts[i] > t_parts[i]:
			return True
		if v_parts[i] < t_parts[i]:
			return False
	return True  # Equal

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

	# If URL is provided, resolve it to a peer ID
	url = a.input("url")
	peer = ""
	if url:
		peer = mochi.remote.peer(url)
		if not peer:
			return {"status": 500, "error": "Failed to connect to server at " + url, "data": {}}

	s = mochi.remote.stream(id, "publisher", "information", {"app": id}, peer)
	if not s:
		return {"status": 500, "error": "Failed to connect to publisher", "data": {}}
	r = s.read()
	if r.get("status") != "200":
		return {"status": 500, "error": "Failed to get app information", "data": {}}

	app = s.read()
	fingerprint = mochi.entity.fingerprint(app["id"], True)
	tracks = s.read()

	return {"data": {"app": app, "fingerprint": fingerprint, "tracks": tracks, "peer": peer}}

# Get version information for an app from its publisher
def action_version(a):
	id = a.input("id")
	if not id:
		return {"status": 400, "error": "App ID is required", "data": {}}
	if len(id) > 51:
		return {"status": 400, "error": "Invalid app ID", "data": {}}
	track = a.input("track", "")
	if len(track) > 50:
		return {"status": 400, "error": "Invalid track", "data": {}}

	s = mochi.remote.stream(id, "publisher", "version", {"app": id, "track": track})
	if not s:
		return {"status": 500, "error": "Failed to connect to publisher", "data": {}}
	r = s.read()
	if r.get("status") != "200":
		return {"status": 500, "error": r.get("message", "Failed to get version"), "data": {}}

	return s.read()

# Install an app from a publisher entity
def action_install_publisher(a):
	# Check if user is allowed to install apps
	if a.user.role != "administrator":
		if mochi.setting.get("apps_install_user") != "true":
			return {"status": 403, "error": "App installation is restricted to administrators", "data": {}}

	id = a.input("id")
	version = a.input("version")
	peer = a.input("peer")
	if not id:
		return {"status": 400, "error": "App ID is required", "data": {}}
	if len(id) > 51:
		return {"status": 400, "error": "Invalid app ID", "data": {}}
	if not version:
		return {"status": 400, "error": "Version is required", "data": {}}
	if not mochi.valid(version, "version"):
		return {"status": 400, "error": "Invalid version format", "data": {}}

	file = "install_" + mochi.random.alphanumeric(8) + ".zip"
	s = mochi.remote.stream(id, "publisher", "get", {"version": version}, peer)
	if not s:
		return {"status": 500, "error": "Failed to connect to publisher", "data": {}}
	r = s.read()
	if r.get("status") != "200":
		return {"status": 500, "error": r.get("message", "Failed to download app"), "data": {}}

	s.read_to_file(file)
	mochi.app.file.install(id, file, False, peer)
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

# Install an app by ID (public) or ID@publisher (private)
def action_install_id(a):
	if a.user.role != "administrator":
		if mochi.setting.get("apps_install_user") != "true":
			return {"status": 403, "error": "App installation is restricted to administrators", "data": {}}

	input = a.input("id")
	if not input:
		return {"status": 400, "error": "App ID is required", "data": {}}

	# Parse app@publisher format
	publisher = ""
	id = input
	if "@" in input:
		parts = input.split("@", 1)
		id = parts[0]
		publisher = parts[1]

	if len(id) > 51:
		return {"status": 400, "error": "Invalid app ID", "data": {}}
	if publisher and len(publisher) > 51:
		return {"status": 400, "error": "Invalid publisher ID", "data": {}}

	# Get app information - route to publisher if known, otherwise use directory
	if publisher:
		s = mochi.remote.stream(publisher, "publisher", "information", {"app": id})
	else:
		entry = mochi.directory.get(id)
		if not entry:
			return {"status": 404, "error": "App not found. For private apps use format: app_id@publisher", "data": {}}
		s = mochi.remote.stream(id, "publisher", "information", {"app": id})
	if not s:
		return {"status": 500, "error": "Failed to connect to publisher", "data": {}}
	r = s.read()
	if r.get("status") != "200":
		return {"status": 500, "error": r.get("message", "Failed to get app information"), "data": {}}

	app = s.read()
	tracks = s.read()

	# Find version for default track
	default_track = app.get("default_track", "Production")
	version = ""
	for t in tracks:
		if t.get("track") == default_track:
			version = t.get("version")
			break

	if not version:
		return {"status": 404, "error": "No version available for track: " + default_track, "data": {}}

	# Download and install
	file = "install_" + mochi.random.alphanumeric(8) + ".zip"
	if publisher:
		s = mochi.remote.stream(publisher, "publisher", "get", {"app": id, "version": version})
	else:
		s = mochi.remote.stream(id, "publisher", "get", {"app": id, "version": version})
	if not s:
		return {"status": 500, "error": "Failed to connect to publisher", "data": {}}
	r = s.read()
	if r.get("status") != "200":
		return {"status": 500, "error": r.get("message", "Failed to download app"), "data": {}}

	s.read_to_file(file)
	mochi.app.file.install(id, file, False, publisher)
	mochi.file.delete(file)

	return {"data": {"installed": True, "id": id, "version": version, "name": app.get("name", "")}}

# Check for updates for all installed apps
def action_updates(a):
	all_apps = mochi.app.list()
	updates = []
	debug = []

	for app in all_apps:
		if app.get("engine") != "starlark":
			continue
		if not is_entity_id(app["id"]):
			continue  # Skip development apps

		app_debug = {"name": app.get("name"), "id": app["id"], "latest": app.get("latest")}

		# Determine publisher: app.json first, then directory
		publisher = ""
		pub_config = app.get("publisher")
		if pub_config and pub_config.get("entity"):
			publisher = pub_config["entity"]
		else:
			entry = mochi.directory.get(app["id"])
			if not entry:
				app_debug["skip"] = "not in directory"
				debug.append(app_debug)
				continue  # Not in directory, skip

		# Query for latest version - route to publisher, pass app ID in content
		# Empty track lets publisher use its default_track
		if publisher:
			s = mochi.remote.stream(publisher, "publisher", "version", {"app": app["id"]})
		else:
			s = mochi.remote.stream(app["id"], "publisher", "version", {"app": app["id"]})
		if not s:
			app_debug["skip"] = "stream failed"
			debug.append(app_debug)
			continue
		r = s.read()
		if r.get("status") != "200":
			app_debug["skip"] = "status " + str(r.get("status"))
			debug.append(app_debug)
			continue

		remote = s.read()
		remote_version = remote.get("version", "")
		app_debug["remote_version"] = remote_version

		if remote_version and remote_version != app.get("latest"):
			updates.append({
				"id": app["id"],
				"name": app.get("name", app["id"]),
				"current": app.get("latest"),
				"available": remote_version,
				"publisher": publisher
			})
			app_debug["update"] = True
		else:
			app_debug["skip"] = "same version"
		debug.append(app_debug)

	return {"data": {"updates": updates}}

# Upgrade a single app to a specific version
def action_upgrade(a):
	if a.user.role != "administrator":
		if mochi.setting.get("apps_install_user") != "true":
			return {"status": 403, "error": "App upgrades restricted to administrators", "data": {}}

	id = a.input("id")
	version = a.input("version")

	if not id or len(id) > 51:
		return {"status": 400, "error": "Invalid app ID", "data": {}}
	if not version or not mochi.valid(version, "version"):
		return {"status": 400, "error": "Invalid version", "data": {}}

	# Get current app to find publisher
	app = mochi.app.get(id)
	if not app:
		return {"status": 404, "error": "App not installed", "data": {}}

	# Determine publisher
	publisher = ""
	pub_config = app.get("publisher")
	if pub_config and pub_config.get("entity"):
		publisher = pub_config["entity"]
	else:
		entry = mochi.directory.get(id)
		if not entry:
			return {"status": 400, "error": "Cannot upgrade: publisher unknown", "data": {}}

	# Download and install - route to publisher, pass app ID in content
	file = "upgrade_" + mochi.random.alphanumeric(8) + ".zip"
	if publisher:
		s = mochi.remote.stream(publisher, "publisher", "get", {"app": id, "version": version})
	else:
		s = mochi.remote.stream(id, "publisher", "get", {"app": id, "version": version})
	if not s:
		return {"status": 500, "error": "Failed to connect to publisher", "data": {}}
	r = s.read()
	if r.get("status") != "200":
		return {"status": 500, "error": r.get("message", "Failed to download app"), "data": {}}

	s.read_to_file(file)
	mochi.app.file.install(id, file, False, publisher)
	mochi.file.delete(file)

	return {"data": {"upgraded": True, "id": id, "version": version}}

# Multi-version apps support (requires Mochi 0.3+)

# Check if multi-version apps feature is available
def action_available(a):
	# TODO: restore version check once mochi.server.version() issue is resolved
	return {"data": {"available": True, "version": "0.3"}}

# Require administrator role
def require_admin(a):
	if a.user.role != "administrator":
		a.error(403, "Administrator access required")
		return False
	return True

# User app preferences

def action_user_apps(a):
	"""Get user app preferences data"""
	# Get all installed apps with their versions
	apps = mochi.app.list()
	for app in apps:
		app["versions"] = mochi.app.versions(app["id"])
		app["tracks"] = mochi.app.tracks(app["id"])

	# Get user's version preferences
	versions = {}
	for app in apps:
		v = a.user.app.version.get(app["id"])
		if v:
			versions[app["id"]] = v

	# Get user's routing overrides
	classes = getattr(a.user.app, "class").list()
	services = a.user.app.service.list()
	paths = a.user.app.path.list()

	a.json({
		"apps": apps,
		"versions": versions,
		"classes": classes,
		"services": services,
		"paths": paths,
	})

def action_user_apps_app(a):
	"""Get version info for a single app"""
	app_id = a.input("app")
	if not app_id:
		a.error(400, "Missing app parameter")
		return

	app = mochi.app.get(app_id)
	if not app:
		a.error(404, "App not found")
		return

	versions = mochi.app.versions(app_id)
	tracks = mochi.app.tracks(app_id)
	user_pref = a.user.app.version.get(app_id)

	# System default requires admin
	system_default = None
	if a.user.role == "administrator":
		system_default = mochi.app.version.get(app_id)

	a.json({"data": {
		"versions": versions,
		"tracks": tracks,
		"user": user_pref,
		"system": system_default,
	}})

def action_user_apps_version_set(a):
	"""Set user's preferred version or track for an app"""
	app_id = a.input("app")
	version = a.input("version", "")
	track = a.input("track", "")

	if not app_id:
		a.error(400, "Missing app parameter")
		return

	a.user.app.version.set(app_id, version, track)
	a.json({"ok": True})

def action_user_apps_routing_set(a):
	"""Set user's routing override for a class, service, or path"""
	routing_type = a.input("type")
	name = a.input("name")
	app_id = a.input("app", "")

	if not routing_type or not name:
		a.error(400, "Missing type or name parameter")
		return

	if routing_type == "class":
		if app_id:
			getattr(a.user.app, "class").set(name, app_id)
		else:
			getattr(a.user.app, "class").delete(name)
	elif routing_type == "service":
		if app_id:
			a.user.app.service.set(name, app_id)
		else:
			a.user.app.service.delete(name)
	elif routing_type == "path":
		if app_id:
			a.user.app.path.set(name, app_id)
		else:
			a.user.app.path.delete(name)
	else:
		a.error(400, "Invalid routing type")
		return

	a.json({"ok": True})

def action_user_apps_reset(a):
	"""Reset all user app preferences to system defaults"""
	# Clear all version preferences
	apps = mochi.app.list()
	for app in apps:
		a.user.app.version.delete(app["id"])

	# Clear all routing overrides
	for cls in getattr(a.user.app, "class").list():
		getattr(a.user.app, "class").delete(cls)
	for svc in a.user.app.service.list():
		a.user.app.service.delete(svc)
	for path in a.user.app.path.list():
		a.user.app.path.delete(path)

	a.json({"ok": True})

# System app management (admin only)

def action_system_apps_list(a):
	"""List all installed apps with version info"""
	if not require_admin(a):
		return

	apps = mochi.app.list()
	for app in apps:
		app["versions"] = mochi.app.versions(app["id"])
		app["tracks"] = mochi.app.tracks(app["id"])

	a.json({"apps": apps})

def action_system_apps_get(a):
	"""Get details for a specific app"""
	if not require_admin(a):
		return

	app_id = a.input("app")
	if not app_id:
		a.error(400, "Missing app parameter")
		return

	versions = mochi.app.versions(app_id)
	tracks = mochi.app.tracks(app_id)
	default = mochi.app.version.get(app_id)

	a.json({
		"app": app_id,
		"versions": versions,
		"tracks": tracks,
		"default": default,
	})

def action_system_apps_version_set(a):
	"""Set default version or track for an app"""
	if not require_admin(a):
		return

	app_id = a.input("app")
	version = a.input("version", "")
	track = a.input("track", "")

	if not app_id:
		a.error(400, "Missing app parameter")
		return

	mochi.app.version.set(app_id, version, track)
	a.json({"ok": True})

def action_system_apps_track_set(a):
	"""Set a track to point to a specific version"""
	if not require_admin(a):
		return

	app_id = a.input("app")
	track = a.input("track")
	version = a.input("version")

	if not app_id or not track or not version:
		a.error(400, "Missing app, track, or version parameter")
		return

	mochi.app.track.set(app_id, track, version)
	a.json({"ok": True})

def action_system_apps_cleanup(a):
	"""Remove unused app versions"""
	if not require_admin(a):
		return

	removed = mochi.app.cleanup()
	a.json({"removed": removed})

def action_system_apps_routing(a):
	"""Get all system routing (class, service, path)"""
	if not require_admin(a):
		return

	a.json({
		"classes": getattr(mochi.app, "class").list(),
		"services": mochi.app.service.list(),
		"paths": mochi.app.path.list(),
	})

def action_system_apps_routing_set(a):
	"""Set system routing for a class, service, or path"""
	if not require_admin(a):
		return

	routing_type = a.input("type")
	name = a.input("name")
	app_id = a.input("app")

	if not routing_type or not name:
		a.error(400, "Missing type or name parameter")
		return

	if routing_type == "class":
		if app_id:
			getattr(mochi.app, "class").set(name, app_id)
		else:
			getattr(mochi.app, "class").delete(name)
	elif routing_type == "service":
		if app_id:
			mochi.app.service.set(name, app_id)
		else:
			mochi.app.service.delete(name)
	elif routing_type == "path":
		if app_id:
			mochi.app.path.set(name, app_id)
		else:
			mochi.app.path.delete(name)
	else:
		a.error(400, "Invalid routing type")
		return

	a.json({"ok": True})
