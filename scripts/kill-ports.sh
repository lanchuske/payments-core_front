#!/usr/bin/env bash
# Libera los puertos 3004 (backend Express) y 3005 (Next.js dev) para evitar EADDRINUSE
# Uso: ./scripts/kill-ports.sh [puerto1] [puerto2] ...
# Sin argumentos: mata 3004 y 3005

set -e

PORTS=("${@:-3004 3005}")

for port in "${PORTS[@]}"; do
  if command -v lsof &>/dev/null; then
    pids=$(lsof -ti ":$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      echo "Liberando puerto $port (PIDs: $pids)..."
      echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
  fi
done

# Dar tiempo a que el SO libere los puertos
sleep 1
