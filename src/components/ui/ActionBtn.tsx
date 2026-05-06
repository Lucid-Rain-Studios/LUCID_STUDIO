import React from 'react'

export type ActionBtnSize = 'sm' | 'md'
export type ActionBtnVariant = 'icon' | 'tab'

interface BaseProps {
  /** Hex color (e.g. '#4a9eff'). Defaults to blue. */
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
  /** Visual variant: 'icon' (square, no border by default), 'tab' (transparent border, underline accent). */
  variant?: ActionBtnVariant
  /** When true, even an active button uses transparent background until hovered. Useful for dense rows. */
  ghost?: boolean
}

export interface ActionBtnProps extends BaseProps {
  children: React.ReactNode
}

const DEFAULT_COLOR = '#4a9eff'

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
 * Pass `color` to override the default blue (e.g. '#2dbd6e' for green Push).
 */
export function ActionBtn({
  color = DEFAULT_COLOR,
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

  const height      = size === 'sm' ? 24 : 28
  const fontSize    = size === 'sm' ? 11.5 : 12.5
  const paddingX    = size === 'sm' ? 12 : 12

  const idleBg     = ghost ? 'transparent' : withAlpha(color, '14') // ~8% alpha
  const hoverBg    = withAlpha(color, '2e')                          // ~18% alpha
  const idleBorder = withAlpha(color, '80')                          // ~50% alpha
  const hoverBorder= color

  const bg          = disabled ? 'transparent' : hover ? hoverBg : idleBg
  const border      = disabled ? '1px solid #1d2535' : `1px solid ${hover ? hoverBorder : idleBorder}`
  const textColor   = disabled ? '#344057' : color
  const boxShadow   = !disabled && hover ? `0 0 12px ${withAlpha(color, '33')}` : 'none'

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
        fontFamily: "'IBM Plex Sans', system-ui", fontSize, fontWeight: 500,
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
 */
export function ActionTab({
  active, color = DEFAULT_COLOR, onClick, children, count,
}: {
  active: boolean
  color?: string
  onClick: () => void
  children: React.ReactNode
  count?: number
}) {
  const [hover, setHover] = React.useState(false)
  const accent = color
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 30, paddingLeft: 12, paddingRight: 12,
        background: active
          ? withAlpha(accent, '14')
          : hover ? withAlpha(accent, '0d') : 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? accent : 'transparent'}`,
        color: active ? accent : hover ? withAlpha(accent, 'cc') : '#4a566a',
        fontFamily: "'IBM Plex Sans', system-ui", fontSize: 11, fontWeight: 600,
        letterSpacing: '0.04em', cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s, border-color 0.12s',
      }}
    >
      {children}
      {typeof count === 'number' && count > 0 && (
        <span style={{
          marginLeft: 5, fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          background: active ? withAlpha(accent, '33') : '#1a2030',
          color: active ? accent : '#4a566a',
          borderRadius: 8, padding: '1px 5px',
        }}>{count}</span>
      )}
    </button>
  )
}
