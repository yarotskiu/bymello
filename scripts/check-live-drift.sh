#!/usr/bin/env bash
# Compares the live Shopify theme against the git-tracked theme/ directory.
#
# The Shopify CLI has no built-in "diff" command, so this pulls the live
# theme into a scratch directory and diffs it locally. By default nothing is
# written back to the working tree.
#
#   --apply  copy real content changes (and live-only files) into theme/ so
#            they can be reviewed and committed.
#   --gate   exit non-zero if any content drift exists between live and git.
#            Every file (including config/settings_data.json, templates/*.json,
#            sections/*-group.json) is pushed to live, so any drift there
#            would be silently overwritten by a routine push - it's always
#            blocking. Used by the finish-task skill to gate merging/pushing.
#
# Usage: scripts/check-live-drift.sh [--apply|--gate]

set -eo pipefail

apply=false
gate=false
case "${1:-}" in
  --apply) apply=true ;;
  --gate) gate=true ;;
esac

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
theme_dir="$repo_root/theme"
cd "$theme_dir"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

echo "Pulling live theme into $tmp_dir ..."
# --path re-roots the CLI's project directory for the whole command, so it
# can't be combined with --environment (the environment file wouldn't be
# found at that path). Pass the store directly and target whatever theme is
# currently published (--live), never a hardcoded theme id: the published
# theme can change (e.g. a preview theme gets published) and a stale id
# would silently compare against the wrong theme.
shopify theme pull --store=bymello-store --live --path "$tmp_dir"
echo

# Some files in theme/ use CRLF line endings while a Shopify pull always
# returns LF, so a plain diff flags those as different even when the
# content is identical. Compare with line endings stripped to separate real
# content drift from that line-ending noise.
strip_cr() {
  perl -pe 's/\r\n/\n/g' "$1"
}

local_list="$(find . -type f | sed 's|^\./||' | sort)"
remote_list="$(cd "$tmp_dir" && find . -type f | sed 's|^\./||' | sort)"

only_in_repo=()
while IFS= read -r relative_path; do
  [ -z "$relative_path" ] && continue
  only_in_repo+=("$relative_path")
done <<< "$(comm -23 <(printf '%s\n' "$local_list") <(printf '%s\n' "$remote_list"))"

only_on_live=()
while IFS= read -r relative_path; do
  [ -z "$relative_path" ] && continue
  only_on_live+=("$relative_path")
done <<< "$(comm -13 <(printf '%s\n' "$local_list") <(printf '%s\n' "$remote_list"))"

content_diffs=()
line_ending_only=()
while IFS= read -r relative_path; do
  [ -z "$relative_path" ] && continue
  local_file="$relative_path"
  remote_file="$tmp_dir/$relative_path"
  if ! diff -q "$local_file" "$remote_file" >/dev/null 2>&1; then
    if diff -q <(strip_cr "$local_file") <(strip_cr "$remote_file") >/dev/null 2>&1; then
      line_ending_only+=("$relative_path")
    else
      content_diffs+=("$relative_path")
    fi
  fi
done <<< "$(comm -12 <(printf '%s\n' "$local_list") <(printf '%s\n' "$remote_list"))"

print_section() {
  local title="$1"
  shift
  echo "=== $title ==="
  if [ "$#" -eq 0 ]; then
    echo "(none)"
  else
    printf '%s\n' "$@"
  fi
  echo
}

print_section "Content differs (needs review)" "${content_diffs[@]}"
print_section "Line-endings only (safe to ignore)" "${line_ending_only[@]}"
print_section "Only in git (theme/), missing on live" "${only_in_repo[@]}"
print_section "Only on live, missing in git (theme/)" "${only_on_live[@]}"

if [ "$apply" = true ]; then
  applied=("${content_diffs[@]}" "${only_on_live[@]}")
  if [ "${#applied[@]}" -eq 0 ]; then
    echo "Nothing to apply: no real content drift."
    exit 0
  fi
  for relative_path in "${applied[@]}"; do
    mkdir -p "$(dirname "$relative_path")"
    cp "$tmp_dir/$relative_path" "$relative_path"
  done
  print_section "Applied to theme/ (uncommitted)" "${applied[@]}"
  echo "Files only in git (theme/), missing on live were left untouched (not deleted)."
  exit 0
fi

if [ "$gate" = true ]; then
  blocking=("${content_diffs[@]}" "${only_on_live[@]}")
  if [ "${#blocking[@]}" -gt 0 ]; then
    print_section "BLOCKING drift (would be overwritten by a live push)" "${blocking[@]}"
    echo "Live theme has changes not yet in git. Do not commit/merge/push yet." >&2
    exit 1
  fi
  echo "No blocking drift: live theme content matches git."
  exit 0
fi

if [ "${#content_diffs[@]}" -gt 0 ] || [ "${#only_on_live[@]}" -gt 0 ]; then
  cat >&2 <<'EOF'
Drift detected. For each file above, check whether it's already explained by
our own unpushed git history (git log -- <file>) - that's expected and safe.
Anything else was edited directly on the live theme (e.g. via the Theme
Editor's "Edit code") and isn't in git yet - pull and commit it before
pushing, or it will be overwritten.
EOF
  exit 1
fi

echo "No drift: live theme content matches git (aside from line endings)."
