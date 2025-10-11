# Mochi Apps app
# Copyright Alistair Cunningham 2025

# List apps
def action_list(action, inputs):
	mochi.action.write("list", action["format"], mochi.app.list())

# Install an app given its publisher's entity
#TODO action_install_entity()
def action_install_entity(action, inputs):
	mochi.action.write("install", action["format"])

# Install an app from a .zip file
#TODO action_install_zip()
def action_install_zip(action, inputs):
	mochi.action.write("install", action["format"])

# Enter details of new app
def action_new(action, inputs):
	mochi.action.write("new", action["format"])

# View an app
def action_view(action, inputs):
	app = mochi.app.get(inputs.get("app"))
	if not app:
		mochi.action.error(404, "App not found")
		return
	
	app["fingerprint"] = mochi.entity.fingerprint(app["id"], True)
	
	mochi.action.write("view", action["format"], {"app": app})
