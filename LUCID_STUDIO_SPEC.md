# LUCID STUDIO Product Spec

## Product Positioning

LUCID STUDIO is a local-first creative and work operating system for individuals and teams. It starts as a fast personal desktop workspace for daily planning, notes, time tracking, files, and creative/marketing tools, then expands into optional cloud sync, backup, collaboration, shared workspaces, and paid team features.

The core product principle is:

> Local by default. Cloud when it adds real value.

Users should be able to open the app and immediately use their dashboard, notes, todos, and tools without needing an account. Cloud features should unlock backup, multi-device access, collaboration, shared assets, permissions, and team workflows.

## Strategic Direction

- Build LUCID STUDIO as a desktop-first application.
- Use local storage for personal productivity and private work data.
- Design data models as syncable from the beginning.
- Add cloud as an optional layer for backup, sync, collaboration, team management, and AI usage.
- Avoid locking entire core modules too early.
- Monetize cloud, team, scale, AI, automation, version history, and professional workflows.

## Target Users

- Solo creators managing daily tasks, notes, projects, files, and creative work.
- Freelancers who need personal productivity plus lightweight client/project tracking.
- Small studios that need shared boards, marketing tools, time tracking, and files.
- Internal teams that want a focused workspace without jumping between many separate apps.

## Core Product Areas

### Daily Dashboard

The daily dashboard is the operating center of LUCID STUDIO.

Expected capabilities:

- Daily todos
- Time tracking
- Daily notes
- Active projects
- Recent files
- Quick capture
- Calendar or agenda view
- Focus blocks
- Dashboard widgets
- Personal progress summaries

### Notes And Knowledge

Notes should support both internal app storage and optional integration with a local Markdown vault such as Obsidian.

Expected capabilities:

- Daily notes
- Project notes
- Markdown support
- TXT/Markdown file handling
- Search
- Tags
- Linked notes
- Obsidian vault path configuration
- Optional sync for selected notes or vault metadata

### Tasks, Kanban, And Projects

Tasks should begin as personal local tasks and later expand into cloud-backed collaborative boards.

Expected capabilities:

- Personal todos
- Project tasks
- Kanban boards
- Statuses and priorities
- Due dates
- Time estimates
- Comments for cloud/team workspaces
- Shared boards in paid team tiers

### Time Tracking

Time tracking should support personal use first, then team reporting later.

Expected capabilities:

- Start/stop timer
- Manual time entries
- Project/client association
- Daily/weekly summaries
- Export
- Team reporting in cloud workspaces
- Billable/non-billable tracking

### Files And Assets

LUCID STUDIO should handle local files first, with cloud object storage added later for synced and shared files.

Expected capabilities:

- Local file references
- Imported TXT, Markdown, CSV, spreadsheet, and asset files
- Metadata indexing
- Recent files
- Project file collections
- Cloud backup for selected files
- Team shared asset libraries

### Marketing Tools

Marketing tools should be organized as modules but should not require a separate product shell.

Expected capabilities:

- Content calendar
- Campaign planning
- Copywriting tools
- Social post drafts
- Email campaign planning
- Asset checklist
- AI-assisted content generation
- Exportable campaign documents

### Creative And Board Tools

Visual/collaborative boards should come after the local productivity foundation is stable.

Expected capabilities:

- Local boards or canvases
- Mood boards
- Campaign boards
- Brand boards
- Figma-like collaboration later
- Shared comments, presence, and permissions in cloud workspaces

## Architecture Direction

### Local App

Recommended local stack:

- Electron desktop app
- Vite frontend
- SQLite for structured local data
- Local filesystem for user-owned files/assets
- Markdown files for note interoperability where useful
- Stable IDs for all syncable records
- Created/updated/deleted timestamps
- Change log or sync journal from the beginning

### Cloud Layer

Recommended cloud stack when needed:

- Account service
- Postgres for cloud workspace data
- Object storage for synced files/assets
- Sync API
- Billing service
- Role and permission model
- Optional real-time collaboration services

### Data Categories

1. Local personal data
   - Daily notes
   - Todos
   - Time logs
   - Preferences
   - Local dashboards

2. Local files with indexed metadata
   - Markdown notes
   - TXT files
   - Spreadsheets
   - Assets
   - Exports

3. Cloud workspace data
   - Shared boards
   - Team projects
   - Collaboration state
   - Synced notes/files
   - Billing
   - Permissions

## Monetization Direction

Prefer capability-based pricing over hard module locks.

The free product should feel complete for personal local use. Paid plans should unlock features that create ongoing cost, professional value, or team scale.

### Free

- Local-only personal use
- Daily dashboard
- Todos
- Notes
- Basic time tracking
- Basic marketing tools
- Limited projects/workspaces
- Manual export

### Pro

- Cloud backup
- Multi-device sync
- More projects/workspaces
- Version history
- Advanced templates
- Advanced AI tools
- Larger file limits
- Automation
- Enhanced Obsidian integration

### Team

- Shared workspaces
- Shared Kanban boards
- Team time tracking
- Comments and activity history
- Roles and permissions
- Shared asset libraries
- Admin billing
- Team reporting
- Collaboration tools

## Product Phases

### Phase 0: Product Definition

- [x] Define local-first product direction
- [x] Define cloud as optional backup/sync/collaboration layer
- [x] Define initial module list
- [x] Define high-level pricing strategy
- [x] Create initial product spec

### Phase 1: Repo And App Foundation

- [x] Decide whether to fork/clone the existing LUCID GIT repository
- [x] Create or initialize the LUCID STUDIO repository
- [x] Rename package/app/build metadata to LUCID STUDIO
- [ ] Remove unrelated legacy product screens
- [x] Keep useful Electron, Vite, routing, storage, and build infrastructure
- [x] Establish app shell and navigation
- [x] Establish local settings/preferences storage
- [ ] Confirm development and production builds run

### Phase 2: Local Data Foundation

- [x] Choose local database approach
- [x] Add SQLite or equivalent local persistence
- [x] Define stable record IDs
- [x] Add created/updated/deleted timestamps
- [x] Add local project/workspace model
- [x] Add sync-ready change tracking structure
- [x] Add local file reference/indexing model

### Phase 3: Daily Dashboard MVP

- [x] Build daily dashboard screen
- [x] Add daily todos
- [x] Add quick capture
- [x] Add daily note area
- [x] Add basic time tracker
- [x] Add active project summary
- [x] Add recent files/projects
- [x] Persist dashboard data locally

### Phase 4: Notes And Obsidian-Friendly Workflows

- [ ] Add notes module
- [ ] Support Markdown note creation/editing
- [ ] Add daily note creation
- [ ] Add local note search
- [ ] Add tags or categories
- [ ] Add configurable local vault path
- [ ] Read/write compatible Markdown files where appropriate
- [ ] Define boundaries between internal notes and external vault files

### Phase 5: Tasks, Projects, And Time Tracking

- [ ] Add project detail views
- [ ] Add task lists by project
- [ ] Add Kanban board view for local projects
- [ ] Add timer start/stop behavior
- [ ] Add manual time entries
- [ ] Add daily/weekly time summaries
- [ ] Add export for tasks/time logs

### Phase 6: Marketing Tools MVP

- [ ] Add marketing tools section
- [ ] Add content calendar
- [ ] Add campaign planner
- [ ] Add copy draft workspace
- [ ] Add asset checklist
- [ ] Add reusable marketing templates
- [ ] Add exports for marketing plans/campaigns

### Phase 7: Account And Cloud Backup

- [ ] Define account model
- [ ] Add sign-in/sign-out
- [ ] Add cloud API project
- [ ] Add encrypted or privacy-conscious backup strategy
- [ ] Add one-way backup prototype
- [ ] Add restore flow
- [ ] Add sync status UI
- [ ] Add billing-ready user/account records

### Phase 8: Multi-Device Sync

- [ ] Add bidirectional sync
- [ ] Add conflict detection
- [ ] Add conflict resolution rules
- [ ] Add sync logs
- [ ] Add selective sync for files/assets
- [ ] Add version history for paid plans

### Phase 9: Shared Workspaces

- [ ] Add cloud-backed workspace model
- [ ] Add workspace members
- [ ] Add roles and permissions
- [ ] Add shared Kanban boards
- [ ] Add shared project files
- [ ] Add comments/activity history
- [ ] Add team time tracking
- [ ] Add admin billing controls

### Phase 10: Advanced Collaboration And Creative Boards

- [ ] Add collaborative board/canvas prototype
- [ ] Add real-time presence
- [ ] Add collaborative comments
- [ ] Add shared asset libraries
- [ ] Add advanced permissions
- [ ] Add team dashboards
- [ ] Add professional reporting

## Immediate Next Decisions

- [x] Confirm whether LUCID STUDIO should be based on a fork of LUCID GIT.
- [x] Decide which parts of LUCID GIT are reusable.
- [ ] Decide whether the first implementation milestone is app shell cleanup or daily dashboard MVP.
- [ ] Choose local persistence implementation.
- [ ] Decide whether Obsidian integration is a Phase 4 feature or earlier MVP requirement.

## Current Recommendation

Use the existing LUCID GIT repository as the implementation foundation only if its Electron/Vite app shell, build process, and local UI patterns are still useful. Do not slowly mutate the old product in place. Create a dedicated LUCID STUDIO repo/folder, port the reusable foundation, remove legacy product assumptions, and build the daily dashboard first.
