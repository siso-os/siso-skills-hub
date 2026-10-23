---
name: gh-cli
description: GitHub CLI for PRs, issues, repos, authentication, and more.
allowed-tools: Bash(gh:*) Bash(git:*) Bash(jq:*) Bash(cat:*)
---

# GitHub CLI (gh)

## Authentication

```bash
# Authenticate with GitHub
gh auth login

# Check current auth status
gh auth status

# Log out
gh auth logout
```

## Pull Requests

```bash
# Create a PR from current branch
gh pr create --title "Title" --body "Description"

# Create PR with reviewer and labels
gh pr create --title "Title" --body "Desc" --reviewer username --label bug

# List PRs (open by default)
gh pr list
gh pr list --state all --author @me

# View PR details
gh pr view 123
gh pr view 123 --json title,state,url

# Checkout a PR locally
gh pr checkout 123

# Merge a PR
gh pr merge 123 --squash --delete-branch

# Approve a PR
gh pr review 123 --approve

# Add review comment
gh pr review 123 --body "LGTM"

# Request review
gh pr edit 123 --add-reviewer username

# List PR checks status
gh pr checks 123
```

## Issues

```bash
# Create an issue
gh issue create --title "Title" --body "Description" --label bug

# List issues
gh issue list
gh issue list --label "priority:high" --state open

# View issue
gh issue view 456
gh issue view 456 --json title,state,labels,assignees

# Close an issue
gh issue close 456

# Reopen an issue
gh issue reopen 456

# Add comment to issue
gh issue comment 456 --body "Fixed in #123"
```

## Repositories

```bash
# Clone a repo
gh repo clone owner/repo

# View repo info
gh repo view
gh repo view owner/repo
gh repo view owner/repo --json name,description,url

# List repos for authenticated user
gh repo list
gh repo list --limit 50

# Fork a repo
gh repo fork owner/repo

# Sync a fork with upstream
gh repo sync owner/repo --source owner/repo --branch main

# Create a repo
gh repo create my-repo --private --clone
```

## Gists

```bash
# Create a gist
echo "content" | gh gist create --filename test.txt

# List gists
gh gist list

# View gist
gh gist view abc123

# Edit gist
gh gist edited abc123 --filename test.txt
```

## Releases

```bash
# List releases
gh release list

# Create a release
gh release create v1.0.0 --title "v1.0.0" --notes "Release notes"

# View release
gh release view v1.0.0
```

## Search

```bash
# Search code
gh search code "function name" --owner owner

# Search issues/PRs
gh search issues "keyword" --label bug --state open

# Search repos
gh search repos "topic-name" --limit 10
```

## Runners & Actions

```bash
# List workflow runs
gh run list

# View run status
gh run view 12345

# Watch a run in real time
gh run watch 12345

# Download run artifacts
gh run download 12345 --dir ./artifacts
```

## Aliases

```bash
# Set a shell alias for gh
# Add to ~/.zshrc:
# alias pr='gh pr view \1 --json title,state,url,reviewDecision --jq ".[] | \"[\" + .reviewDecision + \"] \" + .title + \" — \" + .url"'

# Create gh alias
gh alias set co 'pr checkout'
gh alias set ls 'repo list'
```

## JSON Output (for scripting)

```bash
# Output PR as JSON
gh pr view 123 --json title,body,state,labels

# Filter with jq
gh issue list --json number,title,labels --jq '.[] | select(.labels[].name == "priority:high")'

# Count open issues
gh issue list --json number --jq 'length'
```

## Installation

```bash
# macOS
brew install gh

# Verify
gh --version
```

## Tips

- Use `--json` + `--jq` for machine-readable output and scripting
- Use `--quiet` to suppress non-essential output
- Use `--paginate` to fetch all pages of results
- Set `GH_REPO` env var to avoid specifying repo in repetitive commands
