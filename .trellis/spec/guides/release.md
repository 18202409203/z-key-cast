# Release Conventions

> Repo release / changelog rules for agents and humans.

---

## Don't: Edit `CHANGELOG.md` by hand

**What**: Never create, edit, or "organize" `CHANGELOG.md` in feature / fix / docs commits.

**Why**: `@zhupengji/release-kit` owns the changelog. Hand edits race the tool and get overwritten or duplicated on `pnpm release` / `pnpm changelog`.

**Instead**:
- Put user-facing intent in the **git commit message** (Conventional Commits).
- Let release-kit generate / update `CHANGELOG.md` at release time (`pnpm release`, `pnpm release:patch|minor|major`, or `pnpm changelog`).

#### Wrong
```text
# In a feat/fix PR or agent commit:
edit CHANGELOG.md → add bullet under ## 1.x.y
```

#### Correct
```text
git commit -m "feat(hud): defer Text/Lite modifier chords"
# CHANGELOG.md untouched; release-kit writes it later
```

**Related**: `package.json` scripts `release`, `release:patch`, `release:minor`, `release:major`, `changelog`.
