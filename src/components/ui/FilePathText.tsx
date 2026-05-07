import React from 'react'
import { AppTooltip } from '@/components/ui/AppTooltip'
import { compactPath } from '@/lib/pathDisplay'

interface FilePathTextProps {
  path: string
  displayText?: string
  maxParents?: number
  className?: string
  style?: React.CSSProperties
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function FilePathText({ path, displayText, maxParents = 2, className, style, side = 'top' }: FilePathTextProps) {
  return (
    <AppTooltip
      side={side}
      content={
        <span style={{ display: 'block', maxWidth: 560, fontFamily: 'var(--lg-font-mono)', overflowWrap: 'anywhere' }}>
          {path}
        </span>
      }
    >
      <span
        className={className}
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        {displayText ?? compactPath(path, maxParents)}
      </span>
    </AppTooltip>
  )
}
