#!/usr/bin/env bash
set -euo pipefail

# Some environments inject deprecated npm proxy vars (npm_config_http_proxy /
# npm_config_https_proxy). npm v10+ prints:
#   "Unknown env config \"http-proxy\". This will stop working in the next major version of npm."
# Run npm with those legacy vars unset to avoid the warning.
unset npm_config_http_proxy || true
unset npm_config_https_proxy || true

exec npm "$@"
