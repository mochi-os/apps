# Mochi Apps app
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

# How long to trust a cached publisher response in action_updates (seconds).
# 5 minutes — short enough that a freshly-deployed app shows up in the badge
# soon, long enough that the badge load is a millisecond-scale DB hit instead
# of ~25 sequential P2P round-trips.
UPDATES_CACHE_TTL = 300

def database_upgrade(version):
	if version == 2:
		# Drop the pre-2026-07 broadcast tables left in the app data DB when
		# broadcast state moved to the per-app system DB - inert, but stale
		# sequence/log copies mislead diagnosis.
		for table in ["sequence", "log", "acknowledged", "received"]:
			mochi.db.execute("drop table if exists " + table)

def database_create():
	mochi.db.execute("create table updates_cache ( app text not null primary key, data text not null, checked integer not null )")

def is_entity_id(id):
	return len(id) >= 50 and len(id) <= 51

# Delete leftover archives in packages/ from install or upgrade actions that
# aborted partway: a failed mochi.app.package.install or package.get ends the
# action, so the delete that follows it never runs. Swept at the start of each
# install/upgrade action. No file timestamps are available to age-gate, so a
# concurrent install's archive can be swept too - that install fails cleanly
# and a retry works.
def sweep_packages():
	if not mochi.file.exists("packages"):
		return
	for file in mochi.file.list("packages"):
		mochi.file.delete("packages/" + file)

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
			fp = mochi.entity.fingerprint(app["id"])
			app["fingerprint"] = fp[:3] + "-" + fp[3:6] + "-" + fp[6:]
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
		a.error.label(404, "errors.app_not_found")
		return

	if is_entity_id(app["id"]):
		fp = mochi.entity.fingerprint(app["id"])
		app["fingerprint"] = fp[:3] + "-" + fp[3:6] + "-" + fp[6:]
	else:
		app["fingerprint"] = ""
	return {"data": {"app": app}}

# Get available apps from the Recommendations service that are not installed
def action_market(a):
	s = mochi.remote.stream("1JYmMpQU7fxvTrwHpNpiwKCgUg3odWqX7s9t1cLswSMAro5M2P", "recommendations", "list", {"type": "app", "language": "en"})
	if not s:
		a.error.label(500, "errors.failed_to_connect_to_recommendations")
		return
	r = s.read()
	if r.get("status") != "200":
		a.error.label(500, "errors.failed_to_connect_to_recommendations")
		return

	market = []
	items = s.read()
	if type(items) not in ["list", "tuple"]:
		a.error.label(500, "errors.invalid_response_from_recommendations")
		return
	for item in items:
		if not mochi.app.get(item["entity"]):
			market.append({"id": item["entity"], "name": item["name"], "blurb": item["blurb"]})

	return {"data": {"apps": market}}

# Get information about an app from its publisher's entity
def action_information(a):
	id = a.input("id")
	if not id:
		a.error.label(400, "errors.app_id_required")
		return
	if len(id) > 51:
		a.error.label(400, "errors.invalid_app_id")
		return

	# If URL is provided, resolve it to a peer ID
	url = a.input("url")
	peer = ""
	if url:
		peer = mochi.remote.peer(url)
		if not peer:
			a.error.label(500, "errors.failed_to_connect_to_server", url=url)
			return

	s = mochi.remote.stream(id, "publisher", "information", {"app": id}, peer)
	if not s:
		a.error.label(500, "errors.failed_to_connect_to_publisher")
		return
	r = s.read()
	if r.get("status") != "200":
		a.error.label(500, "errors.failed_to_get_app_information")
		return

	app = s.read()
	fp = mochi.entity.fingerprint(app["id"])
	fingerprint = fp[:3] + "-" + fp[3:6] + "-" + fp[6:]
	tracks = s.read()

	return {"data": {"app": app, "fingerprint": fingerprint, "tracks": tracks, "peer": peer}}

# Get version information for an app from its publisher
def action_version(a):
	id = a.input("id")
	if not id:
		a.error.label(400, "errors.app_id_required")
		return
	if len(id) > 51:
		a.error.label(400, "errors.invalid_app_id")
		return
	track = a.input("track", "")
	if len(track) > 50:
		a.error.label(400, "errors.invalid_track")
		return

	s = mochi.remote.stream(id, "publisher", "version", {"app": id, "track": track})
	if not s:
		a.error.label(500, "errors.failed_to_connect_to_publisher")
		return
	r = s.read()
	if r.get("status") != "200":
		a.error.label(500, "errors.failed_to_get_version")
		return

	return {"data": s.read()}

# Install an app from a publisher entity
def action_install_publisher(a):
	# Check if user is allowed to install apps
	if a.user.role != "administrator":
		if mochi.setting.get("apps_install_user") != "true":
			a.error.label(403, "errors.app_installation_restricted_to_administrators")
			return

	id = a.input("id")
	version = a.input("version")
	peer = a.input("peer")
	if not id:
		a.error.label(400, "errors.app_id_required")
		return
	if len(id) > 51:
		a.error.label(400, "errors.invalid_app_id")
		return
	if not version:
		a.error.label(400, "errors.version_required")
		return
	if not mochi.text.valid(version, "version"):
		a.error.label(400, "errors.invalid_version_format")
		return
	if peer and len(peer) > 51:
		a.error.label(400, "errors.invalid_peer_id")
		return

	sweep_packages()
	file = "packages/install_" + mochi.random.alphanumeric(8) + ".zip"
	s = mochi.remote.stream(id, "publisher", "get", {"version": version}, peer)
	if not s:
		a.error.label(500, "errors.failed_to_connect_to_publisher")
		return
	r = s.read()
	if r.get("status") != "200":
		a.error.label(500, "errors.failed_to_download_app")
		return

	s.read.file(file)
	mochi.app.package.install(id, file, False, peer)
	mochi.file.delete(file)

	return {"data": {"installed": True, "id": id, "version": version}}

# Install an app from an uploaded zip file
def action_install_file(a):
	# Only administrators can install apps from files
	if a.user.role != "administrator":
		a.error.label(403, "errors.app_installation_restricted_to_administrators")
		return

	name = a.input("file")
	if not name:
		a.error.label(400, "errors.no_file_provided")
		return
	if not mochi.text.valid(name, "filename"):
		a.error.label(400, "errors.invalid_filename")
		return
	if not name.endswith(".zip"):
		a.error.label(400, "errors.file_must_be_a_zip_archive")
		return

	privacy = a.input("privacy", "private")
	if privacy != "public" and privacy != "private":
		a.error.label(400, "errors.invalid_privacy")
		return

	# Save the upload under a server-side name in packages/, where leftovers
	# from aborted attempts are swept on the next install.
	sweep_packages()
	file = "packages/install_" + mochi.random.alphanumeric(8) + ".zip"
	a.upload("file", file)

	# Get app info from the zip file
	info = mochi.app.package.get(file)
	if not info:
		mochi.file.delete(file)
		a.error.label(400, "errors.failed_to_read_app_information")
		return

	# Prove the package installs before creating its entity: a failed install
	# aborts the action, and an entity created first would be left orphaned.
	mochi.app.package.install("", file, True)

	# Create an entity for this app using the name from the archive
	entity = mochi.entity.create("app", info["name"], privacy)
	if not entity:
		mochi.file.delete(file)
		a.error.label(500, "errors.failed_to_create_app_entity")
		return

	# Install the app
	version = mochi.app.package.install(entity, file)
	mochi.file.delete(file)

	return {"data": {"installed": True, "id": entity, "version": version}}

# Parse install input. Accepts three formats and returns (app, publisher):
#   mochi:app/install/<app>[?publisher=<pub>]   — the URI scheme (preferred)
#   <app>@<publisher>                            — legacy private-app shorthand
#   <app>                                        — bare app entity, directory lookup
def parse_install_input(input):
	if input.startswith("mochi:app/install/"):
		rest = input[len("mochi:app/install/"):]
		if "?" in rest:
			path, query = rest.split("?", 1)
		else:
			path, query = rest, ""
		publisher = ""
		if query:
			for part in query.split("&"):
				if part.startswith("publisher="):
					publisher = part[len("publisher="):]
		return path, publisher
	if "@" in input:
		parts = input.split("@", 1)
		return parts[0], parts[1]
	return input, ""

# Install an app from a mochi:app/install/... link, an app@publisher string, or a bare app ID
def action_install_id(a):
	if a.user.role != "administrator":
		if mochi.setting.get("apps_install_user") != "true":
			a.error.label(403, "errors.app_installation_restricted_to_administrators")
			return

	input = a.input("id")
	if not input:
		a.error.label(400, "errors.app_id_required")
		return

	id, publisher = parse_install_input(input.strip())

	if len(id) > 51:
		a.error.label(400, "errors.invalid_app_id")
		return
	if publisher and len(publisher) > 51:
		a.error.label(400, "errors.invalid_publisher_id")
		return

	# Get app information - route to publisher if known, otherwise use directory
	if publisher:
		s = mochi.remote.stream(publisher, "publisher", "information", {"app": id})
	else:
		entry = mochi.directory.get(id)
		if not entry:
			a.error.label(404, "errors.app_not_found_in_directory")
			return
		s = mochi.remote.stream(id, "publisher", "information", {"app": id})
	if not s:
		a.error.label(500, "errors.failed_to_connect_to_publisher")
		return
	r = s.read()
	if r.get("status") != "200":
		a.error.label(500, "errors.failed_to_get_app_information")
		return

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
		a.error.label(404, "errors.no_version_available_for_track", track=default_track)
		return

	# Download and install
	sweep_packages()
	file = "packages/install_" + mochi.random.alphanumeric(8) + ".zip"
	if publisher:
		s = mochi.remote.stream(publisher, "publisher", "get", {"app": id, "version": version})
	else:
		s = mochi.remote.stream(id, "publisher", "get", {"app": id, "version": version})
	if not s:
		a.error.label(500, "errors.failed_to_connect_to_publisher")
		return
	r = s.read()
	if r.get("status") != "200":
		a.error.label(500, "errors.failed_to_download_app")
		return

	s.read.file(file)
	mochi.app.package.install(id, file, False, publisher)
	mochi.file.delete(file)

	return {"data": {"installed": True, "id": id, "version": version, "name": app.get("name", "")}}

# True if version a is strictly newer than version b, comparing dot-separated
# numeric components left-to-right. Empty/missing b means any non-empty a is newer.
def is_newer_version(a, b):
	if not b:
		return bool(a)
	if not a:
		return False
	parts_a = a.split(".")
	parts_b = b.split(".")
	n = max(len(parts_a), len(parts_b))
	for i in range(n):
		pa = parts_a[i] if i < len(parts_a) else ""
		pb = parts_b[i] if i < len(parts_b) else ""
		na = int(pa) if pa.isdigit() else 0
		nb = int(pb) if pb.isdigit() else 0
		if na > nb:
			return True
		if na < nb:
			return False
	return False

# Check for updates for all installed apps.
# Per-publisher version queries are cached in updates_cache for UPDATES_CACHE_TTL
# seconds — without it this action does ~25 sequential P2P round-trips and routinely
# takes over a minute. The cache makes steady-state badge loads near-instant; a
# freshly-deployed app shows up after at most TTL seconds.
def action_updates(a):
	all_apps = mochi.app.list()
	updates = []
	debug = []
	cutoff = mochi.time.now() - UPDATES_CACHE_TTL

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

		# Resolve publisher (used both to query and to attribute updates)
		publisher = ""
		pub_config = app.get("publisher")
		if pub_config and pub_config.get("entity"):
			publisher = pub_config["entity"]

		# Try cache before talking to the publisher
		remote = None
		cached = mochi.db.row("select data, checked from updates_cache where app=?", app["id"])
		if cached and cached["checked"] >= cutoff:
			remote = json.decode(cached["data"])
			app_debug["cached"] = True

		if remote == None:
			if not publisher:
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
			# Cache the full response so the version-field fallback below works on hits too
			mochi.db.execute("replace into updates_cache ( app, data, checked ) values ( ?, ?, ? )", app["id"], json.encode(remote), mochi.time.now())

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

		# Compare with user's active version - only report strictly newer versions
		current = app.get("active", app.get("latest"))
		if is_newer_version(remote_version, current):
			updates.append({
				"id": app["id"],
				"name": app.get("name", app["id"]),
				"current": current,
				"available": remote_version,
				"publisher": publisher
			})
			app_debug["update"] = True
		else:
			app_debug["skip"] = "not newer"
		debug.append(app_debug)

	return {"data": {"updates": updates}}

# Upgrade a single app to a specific version
def action_upgrade(a):
	if a.user.role != "administrator":
		if mochi.setting.get("apps_install_user") != "true":
			a.error.label(403, "errors.app_upgrades_restricted_to_administrators")
			return

	id = a.input("id")
	version = a.input("version")

	if not id or len(id) > 51:
		a.error.label(400, "errors.invalid_app_id")
		return
	if not version or not mochi.text.valid(version, "version"):
		a.error.label(400, "errors.invalid_version")
		return

	# Get current app to find publisher
	app = mochi.app.get(id)
	if not app:
		a.error.label(404, "errors.app_not_installed")
		return

	# Determine publisher
	publisher = ""
	pub_config = app.get("publisher")
	if pub_config and pub_config.get("entity"):
		publisher = pub_config["entity"]
	else:
		entry = mochi.directory.get(id)
		if not entry:
			a.error.label(400, "errors.cannot_upgrade_publisher_unknown")
			return

	# Download and install - route to publisher, pass app ID in content
	sweep_packages()
	file = "packages/upgrade_" + mochi.random.alphanumeric(8) + ".zip"
	if publisher:
		s = mochi.remote.stream(publisher, "publisher", "get", {"app": id, "version": version})
	else:
		s = mochi.remote.stream(id, "publisher", "get", {"app": id, "version": version})
	if not s:
		a.error.label(500, "errors.failed_to_connect_to_publisher")
		return
	r = s.read()
	if r.get("status") != "200":
		a.error.label(500, "errors.failed_to_download_app")
		return

	s.read.file(file)
	mochi.app.package.install(id, file, False, publisher)
	mochi.file.delete(file)

	return {"data": {"upgraded": True, "id": id, "version": version}}

# Search the local directory for installable apps matching a query
def action_directory_search(a):
	if a.user.role != "administrator":
		if mochi.setting.get("apps_install_user") != "true":
			a.error.label(403, "errors.app_installation_restricted_to_administrators")
			return

	query = a.input("q", "")
	if not query or len(query) < 2:
		return {"data": {"apps": []}}
	if len(query) > 100:
		a.error.label(400, "errors.search_query_too_long")
		return

	entries = mochi.directory.search("app", query, True)

	out = []
	for entry in entries:
		if mochi.app.get(entry["id"]):
			continue
		out.append({
			"id": entry["id"],
			"name": entry.get("name", ""),
			"fingerprint": entry.get("fingerprint", ""),
		})
		if len(out) >= 50:
			break

	return {"data": {"apps": out}}

# Multi-version apps support (requires Mochi 0.3+)

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
		a.error.label(403, "errors.administrator_access_required")
		return False
	return True

# User app preferences

def action_user_apps(a):
	"""Get user app preferences data"""
	# Get all installed apps with their versions
	apps = mochi.app.list()
	for app in apps:
		app["versions"] = mochi.app.version.list(app["id"])
		app["tracks"] = mochi.app.track.list(app["id"])

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

	return {"data": {
		"apps": apps,
		"versions": versions,
		"classes": classes,
		"services": services,
		"paths": paths,
	}}

def action_user_apps_app(a):
	"""Get version info for a single app"""
	app_id = a.input("app")
	if not app_id:
		a.error.label(400, "errors.missing_app_parameter")
		return

	app = mochi.app.get(app_id)
	if not app:
		a.error.label(404, "errors.app_not_found")
		return

	versions = mochi.app.version.list(app_id)
	tracks = mochi.app.track.list(app_id)

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
			track_warning = mochi.app.label("warnings.track_no_longer_exists", track=user_track)

	result = {
		"versions": versions,
		"tracks": tracks,
		"default_track": default_track,
		"user": user_pref,
		"system": mochi.app.version.get(app_id),
		"is_admin": a.user.role == "administrator",
		"track_warning": track_warning,
	}

	return {"data": result}

def action_user_apps_version_set(a):
	"""Set user's preferred version or track for an app"""
	app_id = a.input("app")
	version = a.input("version", "")
	track = a.input("track", "")

	if not app_id:
		a.error.label(400, "errors.missing_app_parameter")
		return
	if len(app_id) > 51:
		a.error.label(400, "errors.invalid_app_id")
		return
	if version and not mochi.text.valid(version, "version"):
		a.error.label(400, "errors.invalid_version_format")
		return
	if len(track) > 50:
		a.error.label(400, "errors.invalid_track")
		return

	# If a version is specified (either directly or via track), download it if needed
	if version and is_entity_id(app_id):
		installed_versions = mochi.app.version.list(app_id)
		if version not in installed_versions:
			# Core enforces the same rule inside version.download; checking
			# here turns its aborting internal error into the same labeled
			# 403 action_version_download returns.
			if a.user.role != "administrator" and mochi.setting.get("apps_install_user") != "true":
				a.error.label(403, "errors.not_allowed_to_install_apps")
				return
			mochi.app.version.download(app_id, version)

	a.user.app.version.set(app_id, version, track)
	return {"data": {"ok": True}}

def action_version_download(a):
	"""Download a specific app version from publisher without activating it"""
	app_id = a.input("app")
	version = a.input("version")

	if not app_id:
		a.error.label(400, "errors.missing_app_parameter")
		return
	if len(app_id) > 51:
		a.error.label(400, "errors.invalid_app_id")
		return
	if not version:
		a.error.label(400, "errors.missing_version_parameter")
		return
	if not mochi.text.valid(version, "version"):
		a.error.label(400, "errors.invalid_version_format")
		return

	# Check if user can install apps
	if a.user.role != "administrator" and mochi.setting.get("apps_install_user") != "true":
		a.error.label(403, "errors.not_allowed_to_install_apps")
		return

	ok = mochi.app.version.download(app_id, version)
	return {"data": {"ok": ok}}

def action_user_apps_routing_set(a):
	"""Set user's routing override for a class, service, or path"""
	routing_type = a.input("type")
	name = a.input("name")
	app_id = a.input("app", "")

	if not routing_type or not name:
		a.error.label(400, "errors.missing_type_or_name_parameter")
		return
	if len(name) > 200:
		a.error.label(400, "errors.invalid_name")
		return
	if app_id and len(app_id) > 51:
		a.error.label(400, "errors.invalid_app_id")
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
		a.error.label(400, "errors.invalid_routing_type")
		return

	return {"data": {"ok": True}}

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

	return {"data": {"ok": True}}

# System app management (admin only)

def action_system_apps_list(a):
	"""List all installed apps with version info"""
	if not require_admin(a):
		return

	apps = mochi.app.list()
	for app in apps:
		app["versions"] = mochi.app.version.list(app["id"])
		app["tracks"] = mochi.app.track.list(app["id"])

	return {"data": {"apps": apps}}

def action_system_apps_get(a):
	"""Get details for a specific app"""
	if not require_admin(a):
		return

	app_id = a.input("app")
	if not app_id:
		a.error.label(400, "errors.missing_app_parameter")
		return

	versions = mochi.app.version.list(app_id)
	tracks = mochi.app.track.list(app_id)
	default = mochi.app.version.get(app_id)

	return {"data": {
		"app": app_id,
		"versions": versions,
		"tracks": tracks,
		"default": default,
	}}

def action_system_apps_version_set(a):
	"""Set default version or track for an app"""
	if not require_admin(a):
		return

	app_id = a.input("app")
	version = a.input("version", "")
	track = a.input("track", "")

	if not app_id:
		a.error.label(400, "errors.missing_app_parameter")
		return
	if len(app_id) > 51:
		a.error.label(400, "errors.invalid_app_id")
		return
	if version and not mochi.text.valid(version, "version"):
		a.error.label(400, "errors.invalid_version_format")
		return
	if len(track) > 50:
		a.error.label(400, "errors.invalid_track")
		return

	# If a version is specified (either directly or via track), download it if needed
	if version and is_entity_id(app_id):
		installed_versions = mochi.app.version.list(app_id)
		if version not in installed_versions:
			mochi.app.version.download(app_id, version)

	mochi.app.version.set(app_id, version, track)
	return {"data": {"ok": True}}

def action_system_apps_track_set(a):
	"""Set a track to point to a specific version"""
	if not require_admin(a):
		return

	app_id = a.input("app")
	track = a.input("track")
	version = a.input("version")

	if not app_id or not track or not version:
		a.error.label(400, "errors.missing_param")
		return
	if len(app_id) > 51:
		a.error.label(400, "errors.invalid_app_id")
		return
	if len(track) > 50:
		a.error.label(400, "errors.invalid_track")
		return
	if not mochi.text.valid(version, "version"):
		a.error.label(400, "errors.invalid_version_format")
		return

	mochi.app.track.set(app_id, track, version)
	return {"data": {"ok": True}}

def action_system_apps_cleanup(a):
	"""Remove unused app versions"""
	if not require_admin(a):
		return

	removed = mochi.app.cleanup()
	return {"data": {"removed": removed}}

def action_system_apps_routing(a):
	"""Get all system routing (class, service, path)"""
	if not require_admin(a):
		return

	return {"data": {
		"classes": getattr(mochi.app, "class").list(),
		"services": mochi.app.service.list(),
		"paths": mochi.app.path.list(),
	}}

def action_system_apps_routing_set(a):
	"""Set system routing for a class, service, or path"""
	if not require_admin(a):
		return

	routing_type = a.input("type")
	name = a.input("name")
	app_id = a.input("app")

	if not routing_type or not name:
		a.error.label(400, "errors.missing_type_or_name_parameter")
		return
	if len(name) > 200:
		a.error.label(400, "errors.invalid_name")
		return
	if app_id and len(app_id) > 51:
		a.error.label(400, "errors.invalid_app_id")
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
		a.error.label(400, "errors.invalid_routing_type")
		return

	return {"data": {"ok": True}}

# Permissions management

def action_permissions_list(a):
	"""List permissions for an app"""
	app_id = a.input("app")
	if not app_id:
		a.error.label(400, "errors.missing_app_parameter")
		return
	if len(app_id) > 51:
		a.error.label(400, "errors.invalid_app_id")
		return

	perms = mochi.permission.list(app_id)
	return {"data": {"permissions": perms}}

def action_permissions_catalog(a):
	"""List all defined permissions with their translated names and security levels"""
	return {"data": {"permissions": mochi.permission.catalog()}}

def action_permissions_revoke(a):
	"""Revoke a permission from an app"""
	app_id = a.input("app")
	permission = a.input("permission")

	if not app_id:
		a.error.label(400, "errors.missing_app_parameter")
		return
	if len(app_id) > 51:
		a.error.label(400, "errors.invalid_app_id")
		return
	if not permission:
		a.error.label(400, "errors.missing_permission_parameter")
		return
	if len(permission) > 100:
		a.error.label(400, "errors.invalid_permission")
		return

	mochi.permission.revoke(app_id, permission)
	return {"data": {"status": "revoked", "permission": permission}}

def action_permissions_set(a):
	"""Set a permission for an app (for settings page, allows restricted permissions)"""
	app_id = a.input("app")
	permission = a.input("permission")
	enabled = a.input("enabled") == "true"

	if not app_id:
		a.error.label(400, "errors.missing_app_parameter")
		return
	if len(app_id) > 51:
		a.error.label(400, "errors.invalid_app_id")
		return
	if not permission:
		a.error.label(400, "errors.missing_permission_parameter")
		return
	if len(permission) > 100:
		a.error.label(400, "errors.invalid_permission")
		return

	# Verify app exists
	if not mochi.app.get(app_id):
		a.error.label(404, "errors.app_not_found")
		return

	# Admin-only permissions require administrator role
	if mochi.permission.level(permission) == "administrator" and a.user.role != "administrator":
		a.error.label(403, "errors.this_permission_requires_administrator_role")
		return

	if enabled:
		mochi.permission.grant(app_id, permission)
		return {"data": {"status": "granted", "permission": permission}}
	else:
		mochi.permission.revoke(app_id, permission)
		return {"data": {"status": "revoked", "permission": permission}}
