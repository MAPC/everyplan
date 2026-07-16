#!/bin/bash
export PATH="$HOME/.local/bin:$PATH"
cd "$(dirname "$0")/packages/standalone"
npx next dev -p 3000
