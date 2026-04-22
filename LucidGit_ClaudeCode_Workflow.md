# Lucid Git — How to Run This in Claude Code

Step-by-step workflow for building Lucid Git from the spec.

---

## Do I need Claude Design, or does Claude Code handle UI?

**Short answer: Claude Code handles it all. You do not need Claude Design as a separate step.**

Claude Code is perfectly capable of:
- Writing React + Tailwind components with good visual hierarchy
- Following the design system you've given it (colors, typography, layout)
- Building complex UIs like the commit graph, conflict resolver, diff viewer
- Iterating on visual details when you give feedback ("this feels cramped", "make the lock badge more prominent")

**When you'd use a separate design step:**
- If you want mockups / a Figma file *before* any code is written
- If you want to brainstorm radically different visual directions before committing
- If you want a poster-quality landing page for marketing

For a functional developer tool like Lucid Git, that's overkill. Claude Code + the design tokens in the spec + your iterative feedback will get you there faster.

**One exception worth considering:** you could ask Claude (in this chat or a separate one) to generate a single HTML mockup of the main app screen as an artifact — just to sanity-check the visual direction before Claude Code commits hundreds of components to it. If you want that, just ask. Otherwise, skip straight to Claude Code.

---

## Before you start Claude Code

Do these **before** opening Claude Code:

### 1. Install Node.js 20+ and a package manager
Lucid Git needs Node 20 minimum (for native `fetch`). Download from nodejs.org.

### 2. Create a GitHub OAuth App
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Application name: `Lucid Git`
4. Homepage URL: `https://github.com/YOUR_ORG/lucid-git` (placeholder is fine)
5. Authorization callback URL: `http://localhost` (required by the form but unused by Device Flow)
6. After creating: go to the app's page, scroll to "Device Flow" and check "Enable Device Flow"
7. Copy the **Client ID** — you'll give it to Claude Code

### 3. Create the GitHub repo for Lucid Git itself
This is where you'll host the source code and the built installers. Just an empty private or public repo is fine — Claude Code will init it.

### 4. Install Claude Code
If you haven't already:
```bash
npm install -g @anthropic-ai/claude-code
```
Then `claude` in any terminal to start.

---

## Running the build

### Step 1 — Create an empty project folder
```bash
mkdir lucid-git
cd lucid-git
```

### Step 2 — Put the spec in the folder
Copy `LucidGit_ClaudeCode_Spec.md` into that directory.

### Step 3 — Launch Claude Code
```bash
claude
```

### Step 4 — The first message you send Claude Code

Copy and paste this verbatim:

```
I'm building Lucid Git, a cross-platform Electron + React + TypeScript desktop Git
client for Unreal Engine 5 game dev teams.

The full specification is in LucidGit_ClaudeCode_Spec.md — please read it in full
before doing anything else.

Once you've read it, don't start coding yet. Instead:

1. Tell me anything in the spec that seems ambiguous, risky, or needs clarification.
2. Ask me for the values I need to provide (GitHub OAuth Client ID, target
   GitHub repo URL for releases, etc).
3. Propose the Phase 1 task list in concrete terms so I can approve it before
   you start.

After I approve, proceed with Phase 1 (scaffold + IPC contract). Stop at the
end of each phase and wait for me to verify before moving on. Do NOT skip
ahead or batch multiple phases in one go.
```

This is important: **stop-at-end-of-phase** prevents Claude Code from writing 50 files at once, half of which have bugs, before you can review any of them.

### Step 5 — Work phase by phase

After each phase, run `npm run dev` (after Phase 1 sets this up) and actually try the app. Does the thing you just built work? If yes, tell Claude Code to proceed to the next phase. If no, describe the bug and let it fix before moving on.

Suggested checkpoints per phase:

| Phase | Verification |
|---|---|
| 1 | `npm run dev` opens a window with 3 panels. Electron dev tools open. |
| 2 | Can clone a test repo via the UI. Status shows changed files. |
| 3 | Can sign in with GitHub. Token is in keychain (check with OS keychain viewer). |
| 4 | File tree shows the test repo. Stage/unstage/commit works. Monaco diff renders. |
| 5 | Lock a file on a repo with LFS. Lock badge appears. Another machine sees the lock. |
| 6 | Create a deliberate merge conflict. Preview lists it with correct contributor/date. |
| 7 | Add a 100 MB file. Auto-detect offers to migrate to LFS. |
| 8 | Run cleanup. Size dashboard shows before/after. |
| 9 | Test webhook fires. Real Discord channel receives a test embed. |
| 10 | Commit graph renders. Restore-to-commit creates safety branch. |
| 11 | Open a UE project. `.gitattributes` gets written correctly. |
| 12 | Toggle a hook on/off — verify the executable bit changed. |
| 13 | Trigger each of the 14 error codes; each shows the right UI. |
| 14 | Build installer on one platform. Install on a clean VM. App launches. |
| 15 | Cmd+K opens palette. All settings screens reachable. |

### Step 6 — First real build

After Phase 14, tag the repo:
```bash
git tag v0.1.0
git push --tags
```

GitHub Actions builds installers for all three platforms and drops them in GitHub Releases automatically. Share the link with your teammates.

### Step 7 — Teammates install
They go to your Releases page, download the installer for their OS, run it, sign in with GitHub, clone the repo, done. No terminal, no Node, no Git install.

---

## Tips for working with Claude Code on this

**Keep context small.** Don't dump the whole spec into every message after Phase 1. Once Claude Code has the spec in the working directory, it can read it on demand. Just reference it: "Phase 5, LockService section."

**Let it ask questions.** If Claude Code says "should the lock poller default to 60s or make it configurable immediately?" — that's a good sign. Answer concretely.

**If a phase gets messy, rollback.** Git-init your Lucid Git repo on Day 1 and commit after every phase passes verification. If Phase 7 goes sideways, `git reset` to the Phase 6 commit and retry.

**Don't skip verification.** Electron bugs compound fast — an IPC type mismatch in Phase 2 will cause mysterious failures in Phase 9. Verify each phase.

**Expect ~3–5 rounds per phase.** Claude writes code, you test, you report a bug, Claude fixes, repeat. The phases in the spec aren't "one prompt each" — they're units of functionality.

**Ask for tests when things feel shaky.** "Write a vitest test for the git-log-parse utility" is a great use of Claude Code's time when you're unsure a piece of logic is right.

---

## If something goes wrong

**Native modules failing to build (keytar, better-sqlite3):** Most common cause. Solution is usually `npm rebuild` or installing build tools (Xcode CLI tools on Mac, Visual Studio Build Tools on Windows). Claude Code knows how to handle this — just paste the error.

**Electron window is blank:** Check dev tools console. Usually a Vite config or preload script path issue.

**IPC calls hang:** Main process handler probably threw an error that's being swallowed. Wrap handlers in try/catch with logging.

**dugite says Git not found:** ASAR isn't unpacking dugite binaries. Check `asarUnpack` in `electron-builder.yml`.

**Auto-updater says "no update":** GitHub Releases must be set as "Latest release" (not pre-release) or configure `electron-updater` to accept pre-releases.

---

## Estimated timeline

Realistically, with consistent daily sessions:
- **Weekend warrior (5 hr/week):** 3–4 months to v0.1
- **Evenings + weekends (15 hr/week):** 6–8 weeks to v0.1
- **Full-time focus (40 hr/week):** 2–3 weeks to v0.1

v0.1 = usable by your team for real INFERIUS work, not polished.
v1.0 = polished + stable = add another 50% to that timeline.

Don't try to build all 15 phases in one go. Build Phase 1–4, use it yourself for a week, fix what hurts, then continue.

---

## tl;dr workflow

1. Install Node.js 20+, set up GitHub OAuth App with Device Flow, create Lucid Git repo
2. `mkdir lucid-git && cd lucid-git && claude`
3. Paste the spec file in the folder, send the Step 4 message
4. Work phase by phase, commit after each one
5. Tag v0.1.0 when ready → installers auto-publish → share with team

Claude Code handles everything including UI. No separate design tool needed.
