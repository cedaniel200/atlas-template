#!/bin/sh
# GitLeaks guard — blocks commits that contain secrets.
#
# If gitleaks is not installed, the guard warns and exits 0 (non-blocking).
# The isolation guard never inherits this skip: it always runs.

echo "🔍 Scanning staged changes for secrets with GitLeaks..."

if ! command -v gitleaks >/dev/null 2>&1; then
    echo "⚠️  GitLeaks is not installed. Skipping the scan."
    echo "   Install it with: brew install gitleaks"
    exit 0
fi

if ! gitleaks git --pre-commit --staged --verbose; then
    echo "❌ Secrets detected in the staged changes. Commit blocked."
    echo "   Review the findings and remove the secrets."
    exit 1
fi

echo "✅ Secret scan completed — no findings."
exit 0
