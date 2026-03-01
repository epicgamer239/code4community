#!/usr/bin/env bash
# Optional: run with unset malloc vars to reduce log spam (or add unset to ~/.zshrc)
unset MallocStackLogging MallocScribble MallocPreScribble MallocGuardEdges 2>/dev/null || true
exec node ./node_modules/.bin/next dev
