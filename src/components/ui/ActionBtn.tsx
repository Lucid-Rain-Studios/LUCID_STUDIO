import React from 'react'

export type ActionBtnSize = 'sm' | 'md'

interface BaseProps {
  /**
   * Optional explicit hex color (e.g. '#2dbd6e' for semantic green Push).
   * If omitted, the button uses the user's chosen accent color from Settings
   * via the `--lg-accent` / `--lg-accent-rgb` CSS variables.
   */
  color?: string
  disabled?: boolean
  /** Tooltip shown when disabled (rendered via the existing data-disabled-reason attribute). */
  disabledReason?: string | null
  /** Plain hover tooltip. */
  title?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
  /** Additional inline style overrides (merged after the base style). */
  style?: React.CSSProperties
  size?: ActionBtnSize
  /** When true, idle background is transparent; hover/active still tint. Useful for dense rows. */
  ghost?: boolean
}

export interface ActionBtnProps extends BaseProps {
  children: React.ReactNode
}

function withAlpha(hex: string, alphaHex: string): string {
  const c = hex.startsWith('#') ? hex : `#${hex}`
  return `${c}${alphaHex}`
}

/**
 * App-wide action button with the standard tri-state convention:
 *  - disabled  → no background, neutral border
 *  - enabled   → faint colored background + colored border
 *  - hovered   → stronger colored background + colored border + subtle glow
 *
 * Default color follows the Settings → Accent Color choice via CSS variables.
 * Pass an explicit `color` only to override for semantic meaning (Pull, Push, danger, etc.).
 */
export function ActionBtn({
  color,
  disabled = false,
  disabledReason,
  title,
  onClick,
  className,
  style,
  size = 'md',
  ghost = false,
  children,
}: ActionBtnProps) {
  const [hover, setHover] = React.useState(false)

  const height   = size === 'sm' ? 24 : 28
  const fontSize = size === 'sm' ? 11.5 : 12.5
  const paddingX = 12

  // Theme accent path: build colors from CSS vars so they live-update with Settings.
  // Override path: caller passed a hex (semantic intent), use it directly.
  const usingTheme = !color

  const idleBg = ghost
    ? 'transparent'
    : usingTheme
      ? 'rgba(var(--lg-accent-rgb), 0.08)'
      : withAlpha(color!, '14')
  const hoverBg = usingTheme
    ? 'rgba(var(--lg-accent-rgb), 0.18)'
    : withAlpha(color!, '2e')
  const idleBorder = usingTheme
    ? 'rgba(var(--lg-accent-rgb), 0.5)'
    : withAlpha(color!, '80')
  const hoverBorder = usingTheme
    ? 'var(--lg-accent)'
    : color!
  const fg = usingTheme ? 'var(--lg-accent)' : color!
  const glowAlpha = usingTheme
    ? 'rgba(var(--lg-accent-rgb), 0.20)'
    : withAlpha(color!, '33')

  const bg        = disabled ? 'transparent' : hover ? hoverBg : idleBg
  const border    = disabled
    ? '1px solid var(--lg-border, #1d2535)'
    : `1px solid ${hover ? hoverBorder : idleBorder}`
  const textColor = disabled ? 'var(--lg-text-secondary, #344057)' : fg
  const boxShadow = !disabled && hover ? `0 0 12px ${glowAlpha}` : 'none'

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      title={title}
      data-disabled-reason={disabled ? disabledReason ?? undefined : undefined}
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center',
        height, paddingLeft: paddingX, paddingRight: paddingX, borderRadius: 5,
        background: bg, border, color: textColor, boxShadow,
        fontFamily: 'var(--lg-font-ui)', fontSize, fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.12s, border-color 0.12s, color 0.12s, box-shadow 0.12s',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

/**
 * Tab-style action button (e.g. Mine/Team tabs in the Locks card).
 * Active tab is solid color; inactive tab follows the standard tri-state convention.
 * Defaults to the Settings accent color when no `color` is passed.
 */
export function ActionTab({
  active, color, onClick, children, count,
}: {
  active: boolean
  color?: string
  onClick: () => void
  children: React.ReactNode
  count?: number
}) {
  const [hover, setHover] = React.useState(false)
  const usingTheme = !color
  const fg          = usingTheme ? 'var(--lg-accent)' : color!
  const idleTint    = usingTheme ? 'rgba(var(--lg-accent-rgb), 0.08)' : withAlpha(color!, '14')
  const hoverTint   = usingTheme ? 'rgba(var(--lg-accent-rgb), 0.05)' : withAlpha(color!, '0d')
  const countTint   = usingTheme ? 'rgba(var(--lg-accent-rgb), 0.20)' : withAlpha(color!, '33')
  const fadedFg     = usingTheme
    ? 'rgba(var(--lg-accent-rgb), 0.8)'
    : withAlpha(color!, 'cc')

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 30, paddingLeft: 12, paddingRight: 12,
        background: active ? idleTint : hover ? hoverTint : 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? fg : 'transparent'}`,
        color: active ? fg : hover ? fadedFg : 'var(--lg-text-secondary, #4a566a)',
        fontFamily: 'var(--lg-font-ui)', fontSize: 11, fontWeight: 600,
        letterSpacing: '0.04em', cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s, border-color 0.12s',
      }}
    >
      {children}
      {typeof count === 'number' && count > 0 && (
        <span style={{
          marginLeft: 5, fontFamily: 'var(--lg-font-mono)', fontSize: 9,
          background: active ? countTint : 'var(--lg-border, #1a2030)',
          color: active ? fg : 'var(--lg-text-secondary, #4a566a)',
          borderRadius: 8, padding: '1px 5px',
        }}>{count}</span>
      )}
    </button>
  )
}
