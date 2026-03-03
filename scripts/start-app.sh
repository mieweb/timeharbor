#!/bin/bash
# Wrapper script to start the application

# Load NVM if it exists
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Load environment variables if they exist
if [ -f "$HOME/scripts/set-env.sh" ]; then
  source "$HOME/scripts/set-env.sh"
fi

# Start the Node.js application
cd "$HOME/Builds/current"
exec node main.js
