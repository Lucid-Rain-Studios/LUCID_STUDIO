import React from 'react'
import { createRoot } from 'react-dom/client'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { App } from './App'
import './index.css'

// Point the @monaco-editor/react loader at the locally installed monaco-editor
// package. Without this it uses a slow runtime AMD loader; this makes Vite
// bundle Monaco statically so the DiffEditor renders immediately.
loader.config({ monaco })

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root element not found in index.html')

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
