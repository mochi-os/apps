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
		# Add user's track/version preference (for display on cards)
		user_pref = a.user.app.version.get(app["id"])
		if user_pref:
			app["user_track"] = user_pref.get("track", "")
			# If user has a version preference, show that instead of latest
			if user_pref.get("version"):
				app["latest"] = user_pref["version"]
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

# Get available apps from the Featured service that are not installed
def action_market(a):
	s = mochi.remote.stream("1JYmMpQU7fxvTrwHpNpiwKCgUg3odWqX7s9t1cLswSMAro5M2P", "featured", "list", {"type": "app", "language": "en"})
	if not s:
		return {"status": 500, "error": "Failed to connect to Featured", "data": {}}
	r = s.read()
	if r.get("status") != "200":
		return {"status": 500, "error": "Failed to connect to Featured", "data": {}}

	market = []
	items = s.read()
	if type(items) != "list":
		return {"status": 500, "error": "Invalid response from Featured", "data": {}}
	for item in items:
		if not mochi.app.get(item["entity"]):
			market.append({"id": item["entity"], "name": item["name"], "blurb": item["blurb"]})

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
	mochi.app.package.install(id, file, False, peer)
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
	info = mochi.app.package.get(file)
	if not info:
		mochi.file.delete(file)
		return {"status": 400, "error": "Failed to read app info from archive", "data": {}}

	# Create an entity for this app using the name from the archive
	entity = mochi.entity.create("app", info["name"], privacy)
	if not entity:
		mochi.file.delete(file)
		return {"status": 500, "error": "Failed to create app entity", "data": {}}

	# Install the app
	version = mochi.app.package.install(entity, file)
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
	mochi.app.package.install(id, file, False, publisher)
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

		app_debug = {"name": app.get("name"), "id": app["id"], "active": app.get("active")}

		# Get user's track preference
		user_pref = a.user.app.version.get(app["id"])
		user_track = ""
		if user_pref:
			user_track = user_pref.get("track", "")
			# Only skip if user is pinned to a specific version WITHOUT a track
			if user_pref.get("version") and not user_track:
				app_debug["skip"] = "pinned to version " + user_pref.get("version")
				debug.append(app_debug)
				continue

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

		# Query publisher for version info (includes all tracks)
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
		tracks = remote.get("tracks", [])
		default_track = remote.get("default_track", "Production")

		# Determine which track to check for updates
		check_track = user_track or default_track
		app_debug["track"] = check_track

		# Find version for the track we're checking
		remote_version = ""
		for t in tracks:
			if t.get("track") == check_track:
				remote_version = t.get("version", "")
				break

		# Fall back to default version field if track not found in array
		if not remote_version:
			remote_version = remote.get("version", "")
		app_debug["remote_version"] = remote_version

		# Compare with user's active version
		current = app.get("active", app.get("latest"))
		if remote_version and remote_version != current:
			updates.append({
				"id": app["id"],
				"name": app.get("name", app["id"]),
				"current": current,
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
	mochi.app.package.install(id, file, False, publisher)
	mochi.file.delete(file)

	return {"data": {"upgraded": True, "id": id, "version": version}}

# Multi-version apps support (requires Mochi 0.3+)

# Check if multi-version apps feature is available
def action_available(a):
	# TODO: restore version check once mochi.server.version() issue is resolved
	return {"data": {"available": True, "version": "0.3"}}

def action_routing(a):
	"""Get routing info: what's declared by apps, what's bound system/user level"""
	apps = mochi.app.list()
	is_admin = a.user.role == "administrator"

	# Build maps: resource -> {apps: [...], system: app_id, user: app_id}
	classes = {}
	services = {}
	paths = {}

	for app in apps:
		app_info = {"id": app["id"], "name": app["name"]}
		for c in app.get("classes", []):
			if c not in classes:
				classes[c] = {"apps": [], "system": "", "user": ""}
			classes[c]["apps"].append(app_info)
		for s in app.get("services", []):
			if s not in services:
				services[s] = {"apps": [], "system": "", "user": ""}
			services[s]["apps"].append(app_info)
		for p in app.get("paths", []):
			if p not in paths:
				paths[p] = {"apps": [], "system": "", "user": ""}
			paths[p]["apps"].append(app_info)

	# Add system bindings (visible to all users so they know what "Default" means)
	system_classes = getattr(mochi.app, "class").list()
	system_services = mochi.app.service.list()
	system_paths = mochi.app.path.list()
	for c in classes:
		classes[c]["system"] = system_classes.get(c, "")
	for s in services:
		services[s]["system"] = system_services.get(s, "")
	for p in paths:
		paths[p]["system"] = system_paths.get(p, "")

	# Add user bindings
	user_classes = getattr(a.user.app, "class").list()
	user_services = a.user.app.service.list()
	user_paths = a.user.app.path.list()
	for c in classes:
		classes[c]["user"] = user_classes.get(c, "")
	for s in services:
		services[s]["user"] = user_services.get(s, "")
	for p in paths:
		paths[p]["user"] = user_paths.get(p, "")

	return {"data": {"classes": classes, "services": services, "paths": paths, "is_admin": is_admin}}

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

	# If no local tracks and app is from publisher, fetch from publisher via P2P
	default_track = ""
	if not tracks and is_entity_id(app_id):
		s = mochi.remote.stream(app_id, "publisher", "information", {})
		if s:
			r = s.read()
			if r.get("status", "") == "200":
				app_info = s.read()
				default_track = app_info.get("default_track", "")
				publisher_tracks = s.read()
				for t in publisher_tracks:
					tracks[t["track"]] = t["version"]

	user_pref = a.user.app.version.get(app_id)

	# Check if user's track preference still exists
	track_warning = ""
	if user_pref and user_pref.get("track"):
		user_track = user_pref["track"]
		if user_track not in tracks:
			track_warning = "Track '" + user_track + "' no longer exists on the publisher"

	result = {
		"versions": versions,
		"tracks": tracks,
		"default_track": default_track,
		"user": user_pref,
		"system": mochi.app.version.get(app_id),
		"is_admin": a.user.role == "administrator",
		"track_warning": track_warning,
	}

	a.json({"data": result})

def action_user_apps_version_set(a):
	"""Set user's preferred version or track for an app"""
	app_id = a.input("app")
	version = a.input("version", "")
	track = a.input("track", "")

	if not app_id:
		a.error(400, "Missing app parameter")
		return

	# If a version is specified (either directly or via track), download it if needed
	if version and is_entity_id(app_id):
		installed_versions = mochi.app.versions(app_id)
		if version not in installed_versions:
			mochi.app.version.download(app_id, version)

	a.user.app.version.set(app_id, version, track)
	a.json({"ok": True})

def action_version_download(a):
	"""Download a specific app version from publisher without activating it"""
	app_id = a.input("app")
	version = a.input("version")

	if not app_id:
		a.error(400, "Missing app parameter")
		return
	if not version:
		a.error(400, "Missing version parameter")
		return

	# Check if user can install apps
	if a.user.role != "administrator" and mochi.setting.get("apps_install_user") != "true":
		a.error(403, "Not authorized to install apps")
		return

	ok = mochi.app.version.download(app_id, version)
	a.json({"ok": ok})

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

	# If a version is specified (either directly or via track), download it if needed
	if version and is_entity_id(app_id):
		installed_versions = mochi.app.versions(app_id)
		if version not in installed_versions:
			mochi.app.version.download(app_id, version)

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

# Permissions management

def action_permissions_list(a):
	"""List permissions for an app"""
	app_id = a.input("app")
	if not app_id:
		a.error(400, "Missing app parameter")
		return

	perms = mochi.permission.list(app_id)
	a.json({"permissions": perms})

def action_permissions_grant(a):
	"""Grant a permission to an app"""
	# Security: Only allow requests from the permission request page
	# Referer format: "http://host/path" - verify path is exactly /apps/permissions/request
	referer = a.header("Referer")
	valid = False
	if "://" in referer:
		after_scheme = referer.split("://", 1)[1]  # "host/path?query"
		if "/" in after_scheme:
			path = "/" + after_scheme.split("/", 1)[1]  # "/apps/permissions/request?..."
			# Must be exact path or path with query string (not /apps/permissions/requestevil)
			valid = path == "/apps/permissions/request" or path.startswith("/apps/permissions/request?")
	if not valid:
		a.error(403, "Invalid request origin")
		return

	app_id = a.input("app")
	permission = a.input("permission")

	if not app_id:
		a.error(400, "Missing app parameter")
		return
	if not permission:
		a.error(400, "Missing permission parameter")
		return

	# Verify app exists
	if not mochi.app.get(app_id):
		a.error(404, "App not found")
		return

	# Restricted permissions cannot be granted through this endpoint
	# They must be enabled manually in app settings
	restricted = [
		"url:*",
		"user/read",
		"setting/write",
		"permission/manage",
		"webpush/send",
	]
	if permission in restricted:
		a.error(403, "Restricted permission must be enabled in app settings")
		return

	mochi.permission.grant(app_id, permission)
	a.json({"status": "granted", "permission": permission})

def action_permissions_revoke(a):
	"""Revoke a permission from an app"""
	app_id = a.input("app")
	permission = a.input("permission")

	if not app_id:
		a.error(400, "Missing app parameter")
		return
	if not permission:
		a.error(400, "Missing permission parameter")
		return

	mochi.permission.revoke(app_id, permission)
	a.json({"status": "revoked", "permission": permission})

def action_permissions_set(a):
	"""Set a permission for an app (for settings page, allows restricted permissions)"""
	app_id = a.input("app")
	permission = a.input("permission")
	enabled = a.input("enabled") == "true"

	if not app_id:
		a.error(400, "Missing app parameter")
		return
	if not permission:
		a.error(400, "Missing permission parameter")
		return

	# Verify app exists
	if not mochi.app.get(app_id):
		a.error(404, "App not found")
		return

	# Admin-only permissions require administrator role
	if mochi.permission.administrator(permission) and a.user.role != "administrator":
		a.error(403, "This permission requires administrator role")
		return

	if enabled:
		mochi.permission.grant(app_id, permission)
		a.json({"status": "granted", "permission": permission})
	else:
		mochi.permission.revoke(app_id, permission)
		a.json({"status": "revoked", "permission": permission})
