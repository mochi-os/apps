# Mochi Apps app
# Copyright Alistair Cunningham 2025

# List apps
def action_list(a):
	a.template("list", mochi.app.list())

# Install an app given its publisher's entity
def action_install_entity(a):
	file = "install_" + mochi.random.alphanumeric(8) + ".zip"
	s = mochi.stream({"from": a.user.identity.id, "to": a.input("id"), "service": "app", "event": "get"}, {"version": a.input("version")})
	r = s.read()
	if r.get("status") != "200":
		a.error(r.get("message"))
		return

	s.read_to_file(file)
	mochi.app.install(a.input("id"), file)
	mochi.file.delete(file)

	a.template("install")

# Get information about an an app from its publisher's entity
def action_information(a):
	s = mochi.stream({"from": a.user.identity.id, "to": a.input("entity"), "service": "app", "event": "information"}, {})
	r = s.read()
	if r.get("status") != "200":
		a.error(r.get("message"))
		return

	app = s.read()
	fingerprint = mochi.entity.fingerprint(app["id"], True)

	a.template("information", {"app": app, "fingerprint": fingerprint, "tracks": s.read()})

# Enter details of new app
def action_new(a):
	a.template("new")

# View an app
def action_view(a):
	app = mochi.app.get(a.input("app"))
	if not app:
		mochi.action.error(404, "App not found")
		return
	
	app["fingerprint"] = mochi.entity.fingerprint(app["id"], True)
	
	a.template("view", {"app": app})
