// tokens.js — buildTheme(config) sets window.T
window.buildTheme = function(config) {
  const isDark     = config.isDark     !== false
  const density    = config.density    || 'comfortable'
  const fontFamily = config.fontFamily || 'IBM Plex Sans'
  const fontSize   = config.fontSize   || 13

  const d = isDark ? {
    bg0: '#0b0d13', bg1: '#10131c', bg2: '#161a27', bg3: '#1d2235', bg4: '#242a3d',
    bgHover: '#1e2436', border: '#252d42', border2: '#2f3a54',
    text1: '#dde1f0', text2: '#8b94b0', text3: '#4e5870',
    shadow: '0 8px 32px rgba(0,0,0,0.55)',
  } : {
    bg0: '#eff1f5', bg1: '#ffffff', bg2: '#f5f6f9', bg3: '#eaecf2', bg4: '#e0e3ec',
    bgHover: '#eceef5', border: '#d2d6e4', border2: '#bcc2d4',
    text1: '#1a1d28', text2: '#5a6278', text3: '#9aa3b8',
    shadow: '0 8px 32px rgba(0,0,0,0.12)',
  }

  const rowH     = density === 'compact' ? 30 : density === 'spacious' ? 44 : 36
  const sectionH = density === 'compact' ? 28 : density === 'spacious' ? 38 : 32

  window.T = Object.assign({}, d, {
    orange: '#e8622f', orangeDim: 'rgba(232,98,47,0.15)', orangeMid: 'rgba(232,98,47,0.30)',
    blue:   '#4d9dff', blueDim:   'rgba(77,157,255,0.15)',
    green:  '#2ec573', greenDim:  'rgba(46,197,115,0.15)',
    yellow: '#f5a832', yellowDim: 'rgba(245,168,50,0.15)',
    red:    '#e84545', redDim:    'rgba(232,69,69,0.15)',
    purple: '#a27ef0', purpleDim: 'rgba(162,126,240,0.15)',
    r1: '4px', r2: '6px', r3: '8px',
    ui:   "'" + fontFamily + "', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Cascadia Code', monospace",
    fontSize, rowH, sectionH, isDark,
    statusColor: function(s) { return { M: this.yellow, A: this.green, D: this.red, R: this.blue, '?': this.purple }[s] || this.text2 },
    statusBg:    function(s) { return { M: this.yellowDim, A: this.greenDim, D: this.redDim, R: this.blueDim, '?': this.purpleDim }[s] || 'transparent' },
  })
}

// Add copy utility to window
window.copyText = function(text, onDone) {
  const run = () => { if (onDone) onDone() }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(run).catch(() => {
      const el = document.createElement('textarea')
      el.value = text; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el); run()
    })
  } else {
    const el = document.createElement('textarea')
    el.value = text; document.body.appendChild(el); el.select()
    document.execCommand('copy'); document.body.removeChild(el); run()
  }
}

// Initialize defaults
window.buildTheme({ isDark: true, density: 'comfortable', fontFamily: 'IBM Plex Sans', fontSize: 13 })
