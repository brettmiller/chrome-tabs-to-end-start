#!/usr/bin/env bash
# Tag and push a release. Bump "version" in manifest.json and commit first;
# this only validates and tags. Pushing the tag triggers .github/workflows/release.yml.
set -euo pipefail
cd "$(dirname "$0")"

version=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
tag="v$version"

branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != "main" ]; then
  echo "on branch '$branch', expected 'main'" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "working tree is dirty -- commit or stash first:" >&2
  git status --short >&2
  exit 1
fi

if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
  echo "tag $tag already exists -- bump version in manifest.json" >&2
  exit 1
fi

prior=$(git tag -l 'v*' --sort=-v:refname | head -1)
if [ -n "$prior" ]; then
  python3 - "$version" "${prior#v}" <<'EOF'
import sys
new, old = (tuple(int(n) for n in v.split(".")) for v in sys.argv[1:3])
if new <= old:
    sys.exit(f"manifest version {sys.argv[1]} is not newer than released {sys.argv[2]}")
EOF
fi

echo "release $tag   (previous: ${prior:-none})"
if [ "${1:-}" != "-y" ]; then
  read -r -p "push $branch and tag $tag? [y/N] " reply
  [ "$reply" = "y" ] || { echo "aborted"; exit 1; }
fi

# Push the branch first so the tag never references commits missing from main.
git push origin "$branch"
git tag -a "$tag" -m "$tag"
git push origin "$tag"
echo "pushed $tag -- follow the build with: gh run watch"
