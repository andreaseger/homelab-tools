---
name: commit
description: Generates commit messages and creates commits. Use when writing commit messages, committing changes, or reviewing staged changes.
---

# Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format.

## Format

```text
<type>(<scope>): <description>

[optional body]

Co-authored-by: <name> (<model>) <email>
```

## Types

- `feat`: User-facing features or behavior changes (must change production code)
- `fix`: Bug fixes (must change production code)
- `docs`: Documentation only
- `style`: Code style/formatting (no logic changes)
- `refactor`: Code restructuring without behavior change
- `test`: Adding or updating tests
- `chore`: CI/CD, tooling, dependency bumps, configs (no production code)

## Scopes

Optional. Use when it adds clarity. Examples: `cloudfront`, `s3`, `ci`.

## Breaking Changes

Use `!` suffix: `feat!: remove deprecated resource`

## Co-Author Attribution

When you contribute to code changes, you must add a co-author line identifying yourself. Use your actual identity:

- **Name**: The product/tool name (e.g., `GitHub Copilot`, `Claude Code`, `Cursor`, `Opencode`, etc.)
- **Model**: The specific model version if known (e.g., `Sonnet 4.6`, `GPT-5.3-codex`, `Kimi K2.5`)
- **Email**: Use `noreply@<domain>` format appropriate to the tool, or `<tool>@users.noreply.github.com` for GitHub.

### Self-Identification

Before generating the commit message, determine your identity by checking:

1. What product or interface are you running in?
2. What model are you? (check your system prompt or capabilities)
3. What is the appropriate email domain for attribution?

### Co-Author Line Format

Include model version in parentheses if known:

```text
Co-authored-by: T3 Chat (Kimi K2.5) <noreply@t3.chat>
```

Omit model if unknown:

```text
Co-authored-by: Claude Code <claude-code@users.noreply.github.com>
```

## Examples

```text
feat(cloudfront): add immutable cache headers

Co-authored-by: GitHub Copilot (Claude Sonnet 4.5) <noreply@github.com>
```

```text
fix: correct CloudFront Function ARN attribute

Updated the resource attribute to use the correct ARN format
for CloudFront Functions as specified in the AWS provider docs.

Co-authored-by: Claude Code (Claude 3.7 Sonnet) <noreply@anthropic.com>
```

```text
chore: add husky pre-commit hooks

Co-authored-by: Opencode (GPT-5.3-codex) <noreply@opencode.ai>
```

## Instructions

1. Run `git diff --staged` to see staged changes
2. If no staged changes assume all changes should be included in the commit
3. Analyze the changes and determine the appropriate type
4. Write a concise description (under 72 characters)
5. Add body only if the "why" isn't obvious from the description
6. **Identify yourself**: Determine your product name, model, and appropriate email
7. Format and add the co-author attribution line at the end
