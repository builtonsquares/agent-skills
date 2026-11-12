#!/usr/bin/env bash
# Build every eval fixture into <dest>/<fixture>, ready for /pre-pr-review.
#
#   bash evals/build-all.sh <dest-dir> [fixture ...]     (default: all fixtures)
#
# <dest-dir> must not exist yet, so a rerun never mixes old and new results.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
[[ $# -ge 1 ]] || { echo "usage: $0 <dest-dir> [fixture ...]" >&2; exit 1; }
dest="$1"; shift
[[ ! -e "$dest" ]] || { echo "build-all: $dest already exists; pick a new folder" >&2; exit 1; }
mkdir -p "$dest"

if [[ $# -gt 0 ]]; then fixtures=("$@"); else
  fixtures=(); for d in "$here"/fixtures/*/; do fixtures+=("$(basename "$d")"); done
fi

for f in "${fixtures[@]}"; do
  bash "$here/build-fixture.sh" "$f" "$dest/$f" >/dev/null
  printf '  %-20s %s\n' "$f" "$dest/$f"
done
echo
echo "Built ${#fixtures[@]} repos. Open each one in your tool and run /pre-pr-review, then:"
echo "  python3 $here/summarize.py $dest > results.md"
