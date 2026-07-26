#!/usr/bin/env bash

set -euo pipefail

echo "=== Snext development environment ==="
echo "User:       $(whoami)"
echo "Host:       $(hostname)"
echo "Directory:  $(pwd)"
echo

echo "=== Base tools ==="
git --version
gh --version | head -n 1
gcc --version | head -n 1
g++ --version | head -n 1
make --version | head -n 1
curl --version | head -n 1

echo
echo "=== Application toolchain ==="
rustc --version
cargo --version
node --version
npm --version
pnpm --version
