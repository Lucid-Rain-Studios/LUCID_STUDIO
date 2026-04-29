# Contribution Graph — Year View Redesign Spec
**Date:** 2026-04-29  
**Status:** Approved

---

## Overview

Replace the current month-at-a-time contribution graph with a full calendar-year view (Jan 1 – Dec 31), matching the GitHub profile graph pattern. Navigation buttons cycle through years. Month names appear as labels above each month's first column inside the SVG. Stats are scoped to the displayed year.

---

## Section 1 — State & Navigation

**File:** `src/components/dashboard/ContributionGraph.tsx`

### State change
`currentMonth: { year: number; month: number }` is replaced with `currentYear: number`, initialized to `new Date().getFullYear()`.

All handlers that referenced `currentMonth` are replaced:
- `goToPreviousYear`: `setCurrentYear(y => y - 1)`
- `goToNextYear`: `setCurrentYear(y => y + 1)`
- `goToThisYear`: `setCurrentYear(new Date().getFullYear())`

### Navigation UI
The three nav buttons become `‹  [year]  ›`:
- `‹` calls `goToPreviousYear`
- The center button displays the current year number (e.g., `2025`) and calls `goToThisYear` on click
- `›` calls `goToNextYear`

The separate `<div>` rendering `currentMonthName` above the SVG is **removed** — the month labels inside the SVG make it redundant.

---

## Section 2 — Year Grid (`yearWeeks`)

Replaces the `visibleWeeks` useMemo entirely.

### Algorithm (all dates in UTC)
1. Compute `Jan 1` of `currentYear`: `new Date(Date.UTC(currentYear, 0, 1))`
2. Find the **Sunday on or before Jan 1**: subtract `jan1.getUTCDay()` days — this is `gridStart`
3. Compute `Dec 31` of `currentYear`: `new Date(Date.UTC(currentYear, 11, 31))`
4. Find the **Saturday on or after Dec 31**: add `(6 - dec31.getUTCDay())` days — this is `gridEnd`
5. Iterate day-by-day from `gridStart` to `gridEnd`, building week arrays of 7 days each

This produces 52–54 week columns depending on the year and which day of the week Jan 1 falls on.

### Out-of-year cells
Days outside Jan 1 – Dec 31 of `currentYear` (the partial weeks at the start and end of the grid) are marked with an `isOverflow: true` flag in the `DayActivity`-like object (or via a simple date-string comparison against the year). Overflow cells:
- Render with a fixed dim color (`#0e1520`) — non-interactive, no tooltip
- The `cursor` style is `default`

---

## Section 3 — Month Labels

Computed as a derived value from `yearWeeks` (not a separate useMemo — computed inline or as a `useMemo` alongside `yearWeeks`).

### Algorithm
For each month `m` in 0–11:
1. Construct `Date.UTC(currentYear, m, 1)` → get its `toDateKey`
2. Find which week-column index `weekIdx` contains a day matching that date key
3. Record `{ label: 'Jan'|'Feb'|..., weekIdx }`

### Rendering
Inside the SVG, above the grid (within the `MONTH_LABEL_HEIGHT = 24` space):

```
x = WEEKDAY_LABEL_WIDTH + weekIdx * (DAY_SIZE + DAY_GAP)
y = 13
```

Rendered as `<text>` elements with `fontSize={9}`, `fill="#5a6880"`, `fontFamily="'IBM Plex Sans', system-ui"`.

Edge case: if Jan 1 falls on a day other than Sunday, the "Jan" label appears above the column that contains Jan 1, not at column 0. Column 0 may contain Dec days from the prior year with no label.

---

## Section 4 — Activity Data Range

### Data window
`computeActivity(commits, 730)` → `computeActivity(commits, 1825)` (5 years).

This ensures navigating back up to ~5 years shows real commit data rather than empty cells. The 10k commit log limit already in place is kept unchanged.

### Stats scoping
`calculateStats` currently operates on the full activity map. Replace the call with a **year-filtered** subset:

```ts
const yearActivity = useMemo(() => {
  const filtered = new Map<string, DayActivity>()
  for (const [key, val] of activity) {
    if (key.startsWith(`${currentYear}-`)) filtered.set(key, val)
  }
  return filtered
}, [activity, currentYear])

const stats = useMemo(() => calculateStats(yearActivity), [yearActivity])
```

Stats displayed (unchanged labels): Total commits · Active days · Max streak · Current streak — but now all scoped to the displayed year.

---

## Section 5 — Today Highlight

When viewing the current year, today's cell gets a subtle ring:

```tsx
const todayKey = toDateKey(Date.now())
// on the <rect>:
stroke={day.date === todayKey ? '#4a9eff' : 'none'}
strokeWidth={day.date === todayKey ? 1 : 0}
```

This provides orientation when navigating back to the current year.

---

## Non-goals

- No "zoom to month" on click.
- No animation on year transition.
- No lazy-loading of commits per year (single upfront load covers 5 years).
- No light-mode color variant.

---

## Files changed

| File | Change type |
|------|-------------|
| `src/components/dashboard/ContributionGraph.tsx` | Redesign — state, grid algorithm, month labels, stats scoping, today highlight |
| `src/lib/activityUtils.ts` | Widen `computeActivity` call site from 730 → 1825 days |
