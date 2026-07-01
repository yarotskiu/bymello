#!/usr/bin/env bash
# Compares the live Shopify theme against the git-tracked theme/ directory.
#
# The Shopify CLI has no built-in "diff" command, so this pulls the live
# theme into a scratch directory and diffs it locally. Nothing is written
# back to Shopify and the working tree is never touched.
#
# Usage: scripts/check-live-drift.sh

set -eo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
theme_dir="$repo_root/theme"
cd "$theme_dir"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

echo "Pulling live theme into $tmp_dir ..."
# --path re-roots the CLI's project directory for the whole command, so it
# can't be combined with --environment (the environment file wouldn't be
# found at that path). Pass the live theme's store/id directly instead.
shopify theme pull --store=bymello-store --theme=201621700933 --path "$tmp_dir"
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
