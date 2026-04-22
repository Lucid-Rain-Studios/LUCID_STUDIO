import React from 'react'
import { FileStatus } from '@/ipc'

interface BinaryDiffProps {
  file: FileStatus
}

const BINARY_LABELS: Record<string, string> = {
  uasset: 'Unreal Asset', umap: 'Unreal Map', pak: 'PAK Archive',
  png: 'PNG Image', jpg: 'JPEG Image', jpeg: 'JPEG Image',
  gif: 'GIF Image', tga: 'TGA Image', bmp: 'Bitmap',
  psd: 'Photoshop Document', tiff: 'TIFF Image',
  wav: 'WAV Audio', mp3: 'MP3 Audio', ogg: 'OGG Audio',
  ttf: 'TrueType Font', otf: 'OpenType Font',
  exe: 'Executable', dll: 'DLL Library',
  zip: 'ZIP Archive', '7z': '7-Zip Archive',
  fbx: 'FBX Model', obj: 'OBJ Model',
}

export function BinaryDiff({ file }: BinaryDiffProps) {
  const ext = file.path.split('.').pop()?.toLowerCase() ?? ''
  const label = BINARY_LABELS[ext] ?? `${ext.toUpperCase()} File`
  const fileName = file.path.split('/').pop() ?? file.path

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4 px-8 max-w-sm">
        <div className="w-16 h-16 rounded-xl bg-lg-bg-elevated border border-lg-border flex items-center justify-center mx-auto">
          <span className="text-[10px] font-mono font-bold text-lg-text-secondary tracking-wider uppercase">
            {ext || 'BIN'}
          </span>
        </div>
        <div>
          <div className="text-sm font-mono text-lg-text-primary font-semibold truncate">
            {fileName}
          </div>
          <div className="text-xs font-mono text-lg-text-secondary mt-1">{label}</div>
        </div>
        <div className="text-[10px] font-mono text-lg-text-secondary leading-relaxed">
          Binary files cannot be shown as text.
          <br />
          Stage or unstage using the badge on the left.
        </div>
      </div>
    </div>
  )
}
