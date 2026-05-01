ENV["BUNDLE_GEMFILE"] ||= File.expand_path("../Gemfile", __dir__)

require "bundler/setup" # Set up gems listed in the Gemfile.

# Load per-developer .env.local (gitignored) and shared .env if present, so
# things like local PGHOST/PGPORT and VISUALIZER_USER_AGENT can be pinned
# without requiring shell-export ceremony. First file wins; pre-existing
# environment variables (e.g. CI's PGHOST) are not overridden.
require "dotenv"
Dotenv.load(
  File.expand_path("../.env.local", __dir__),
  File.expand_path("../.env", __dir__)
)

require "bootsnap/setup" # Speed up boot time by caching expensive operations.
