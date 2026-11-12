#!/bin/sh
# Run before every push: gives this build a unique id so phones see the update banner.
B=$(date -u +%Y%m%d%H%M%S)
printf '{ "build": "%s" }\n' "$B" > version.json
sed -i "s/^export const APP_BUILD = .*/export const APP_BUILD = '$B';/" js/config.js
echo "build $B"
