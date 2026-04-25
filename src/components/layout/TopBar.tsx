import React, { useState, useEffect, useCallback } from 'react'
import { ipc, SyncStatus, UpdateInfo } from '@/ipc'
import { useRepoStore } from '@/stores/repoStore'
import { useAuthStore } from '@/stores/authStore'
import { useOperationStore } from '@/stores/operationStore'
import { useErrorStore } from '@/stores/errorStore'
import { NotificationBell } from '@/components/notifications/NotificationBell'

interface TopBarProps {
  onOpen:       () => void
  onClone:      () => void
  onAddAccount: () => void
  onSynced?:    () => void
}

export function TopBar({ onOpen, onClone, onAddAccount, onSynced }: TopBarProps) {
  const { repoPath, currentBranch, refreshStatus } = useRepoStore()
  const { accounts, currentAccountId, permissionErrors, fetchRepoPermission } = useAuthStore()
  const opRun   = useOperationStore(s => s.run)
  const pushErr = useErrorStore(s => s.pushRaw)

  const [sync, setSync]       = useState<SyncStatus | null>(null)
  const [syncOp, setSyncOp]   = useState<'idle' | 'fetching' | 'pulling' | 'pushing'>('idle')
  const [syncErr, setSyncErr] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const [updateInfo, setUpdateInfo]       = useState<UpdateInfo | null>(null)
  const [updateReady, setUpdateReady]     = useState(false)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const [downloading, setDownloading]     = useState(false)

  const loadSync = useCallback(async () => {
    if (!repoPath) return
    try { setSync(await ipc.getSyncStatus(repoPath)) } catch { /* no upstream */ }
  }, [repoPath])

  useEffect(() => {
    setSync(null); setSyncErr(null)
    if (repoPath) loadSync()
  }, [repoPath, currentBranch])

  useEffect(() => {
    const unsubAvail = ipc.onUpdateAvailable((info: UpdateInfo) => { setUpdateInfo(info); setUpdateDismissed(false) })
    const unsubReady = ipc.onUpdateReady(() => { setUpdateReady(true); setDownloading(false) })
    return () => { unsubAvail(); unsubReady() }
  }, [])

  const doFetch = async () => {
    if (!repoPath || syncOp !== 'idle') return
    setSyncOp('fetching'); setSyncErr(null)
    try { await opRun('Fetching…', () => ipc.fetch(repoPath)); await loadSync() }
    catch (e) { const s = String(e); setSyncErr(s); pushErr(s) }
    finally { setSyncOp('idle') }
  }

  const doPull = async () => {
    if (!repoPath || syncOp !== 'idle') return
    setSyncOp('pulling'); setSyncErr(null)
    try { await opRun('Pulling…', () => ipc.pull(repoPath)); await loadSync(); await refreshStatus(); onSynced?.() }
    catch (e) { const s = String(e); setSyncErr(s); pushErr(s) }
    finally { setSyncOp('idle') }
  }

  const doPush = async () => {
    if (!repoPath || syncOp !== 'idle') return
    setSyncOp('pushing'); setSyncErr(null)
    try { await opRun('Pushing…', () => ipc.push(repoPath)); await loadSync() }
    catch (e) { const s = String(e); setSyncErr(s); pushErr(s) }
    finally { setSyncOp('idle') }
  }

  // Determine the primary sync action
  const isIdle = syncOp === 'idle'
  const hasBehind = (sync?.behind ?? 0) > 0
  const hasAhead  = (sync?.ahead  ?? 0) > 0

  type PrimaryAction = { label: string; action: (() => void) | null; color: string; colorDim: string; count: number; icon: React.ReactNode }

  const primary: PrimaryAction = !isIdle
    ? { label: syncOp === 'fetching' ? 'Fetching…' : syncOp === 'pulling' ? 'Pulling…' : 'Pushing…',
        action: null, color: '#8b94b0', colorDim: '#242a3d', count: 0, icon: null }
    : hasBehind
      ? { label: 'Pull', action: doPull, color: '#f5a832', colorDim: 'rgba(245,168,50,0.15)', count: sync!.behind, icon: <ArrowDown /> }
      : hasAhead
        ? { label: 'Push', action: doPush, color: '#2ec573', colorDim: 'rgba(46,197,115,0.15)', count: sync!.ahead, icon: <ArrowUp /> }
        : { label: 'Fetch', action: doFetch, color: '#8b94b0', colorDim: '#242a3d', count: 0, icon: <FetchIcon /> }

  const borderColor = syncErr ? '#e84545' : primary.count > 0 ? primary.color : '#252d42'
  const bgColor     = syncErr ? 'rgba(232,69,69,0.1)' : primary.count > 0 ? primary.colorDim : 'transparent'
  const labelColor  = syncErr ? '#e84545' : primary.count > 0 ? primary.color : '#8b94b0'

  const repoName = repoPath
    ? (repoPath.replace(/\\/g, '/').split('/').pop() ?? repoPath)
    : null

  const currentAccount = accounts.find(a => a.userId === currentAccountId)
  const initials = currentAccount
    ? currentAccount.login.slice(0, 2).toUpperCase()
    : null

  const showBanner = !updateDismissed && (updateReady || !!updateInfo)
  const [permWarnDismissed, setPermWarnDismissed] = useState(false)
  const permError = repoPath ? permissionErrors[repoPath] : false

  // Re-show warning on repo change
  useEffect(() => { setPermWarnDismissed(false) }, [repoPath])

  return (
    <>
      {/* Permission warning banner */}
      {repoPath && permError && !permWarnDismissed && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 28, fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
          background: 'rgba(245,168,50,0.1)',
          borderBottom: '1px solid rgba(245,168,50,0.25)',
          color: '#f5a832',
        }}>
          <span>Permission check unavailable — operating in collaborator mode. Admin features are restricted.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => fetchRepoPermission(repoPath)}
              style={{ padding: '0 8px', height: 20, borderRadius: 4, border: '1px solid currentColor',
                background: 'transparent', color: 'inherit', fontFamily: 'inherit', fontSize: 10, cursor: 'pointer' }}
            >Retry</button>
            <button onClick={() => setPermWarnDismissed(true)}
              style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.5, cursor: 'pointer', fontSize: 12 }}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Update banner */}
      {showBanner && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 28, fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
          background: updateReady ? 'rgba(46,197,115,0.12)' : 'rgba(77,157,255,0.12)',
          borderBottom: `1px solid ${updateReady ? 'rgba(46,197,115,0.25)' : 'rgba(77,157,255,0.25)'}`,
          color: updateReady ? '#2ec573' : '#4d9dff',
        }}>
          <span>
            {updateReady
              ? `Update v${updateInfo?.version ?? ''} downloaded — ready to install`
              : `Update v${updateInfo?.version ?? ''} available`}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!updateReady && (
              <button onClick={() => { setDownloading(true); ipc.updateDownload().catch(() => setDownloading(false)) }}
                disabled={downloading}
                style={{ padding: '0 8px', height: 20, borderRadius: 4, border: '1px solid currentColor',
                  background: 'transparent', color: 'inherit', fontFamily: 'inherit', fontSize: 10, cursor: 'pointer' }}>
                {downloading ? 'Downloading…' : 'Download'}
              </button>
            )}
            {updateReady && (
              <button onClick={() => ipc.updateInstall()}
                style={{ padding: '0 8px', height: 20, borderRadius: 4, border: '1px solid currentColor',
                  background: 'transparent', color: 'inherit', fontFamily: 'inherit', fontSize: 10,
                  fontWeight: 700, cursor: 'pointer' }}>
                Restart &amp; Install
              </button>
            )}
            <button onClick={() => setUpdateDismissed(true)}
              style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.5, cursor: 'pointer', fontSize: 12 }}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 48, paddingLeft: 16, paddingRight: 12,
        background: '#161a27', borderBottom: '1px solid #252d42',
        flexShrink: 0, gap: 12, zIndex: 20, position: 'relative',
      }}>
        {/* Left: wordmark + repo + branch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700,
            color: '#e8622f', letterSpacing: '0.08em', flexShrink: 0, userSelect: 'none',
          }}>
            LUCID GIT
          </span>

          {repoName ? (
            <>
              <ChevronRight />
              <span style={{ fontFamily: "'IBM Plex Sans', system-ui", fontSize: 14, fontWeight: 600, color: '#dde1f0', flexShrink: 0 }}>
                {repoName}
              </span>
              {currentBranch && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(77,157,255,0.15)', border: '1px solid rgba(77,157,255,0.25)',
                  borderRadius: 20, paddingLeft: 8, paddingRight: 10, height: 22, flexShrink: 0,
                }}>
                  <BranchIconSm />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#4d9dff', fontWeight: 500 }}>
                    {currentBranch}
                  </span>
                </div>
              )}
            </>
          ) : (
            <span style={{ fontFamily: "'IBM Plex Sans', system-ui", fontSize: 13, color: '#4e5870' }}>
              No repository open
            </span>
          )}
        </div>

        {/* Right: sync + notifs + account */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

          {/* Welcome buttons when no repo */}
          {!repoPath && (
            <>
              <TopBtn onClick={onOpen} label="Open" />
              <TopBtn onClick={onClone} label="Clone" accent />
            </>
          )}

          {/* Smart sync split button */}
          {repoPath && (
            <div style={{ position: 'relative', display: 'flex' }}>
              {/* Primary action */}
              <button
                onClick={() => { if (isIdle && primary.action) primary.action() }}
                disabled={!isIdle}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  height: 30, paddingLeft: 10, paddingRight: 10,
                  borderRadius: '6px 0 0 6px', border: `1px solid ${borderColor}`, borderRight: 'none',
                  background: bgColor, color: labelColor,
                  fontFamily: "'IBM Plex Sans', system-ui", fontSize: 13, fontWeight: 500,
                  cursor: isIdle && primary.action ? 'pointer' : 'not-allowed',
                  opacity: !isIdle ? 0.65 : 1, transition: 'all 0.15s',
                }}
              >
                {syncErr ? <WarnIcon /> : primary.icon}
                <span>{syncErr ? 'Sync error' : primary.label}</span>
                {primary.count > 0 && !syncErr && (
                  <span style={{
                    background: `${primary.color}33`, color: primary.color,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
                    borderRadius: 10, paddingLeft: 6, paddingRight: 6, lineHeight: '18px',
                  }}>{primary.count}</span>
                )}
              </button>

              {/* Chevron dropdown */}
              <button
                onClick={() => isIdle && setMenuOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 30, borderRadius: '0 6px 6px 0',
                  border: `1px solid ${borderColor}`,
                  borderLeft: `1px solid ${primary.count > 0 ? `${primary.color}50` : '#252d42'}`,
                  background: menuOpen ? '#242a3d' : bgColor, color: labelColor,
                  cursor: isIdle ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d={menuOpen ? 'M2.5 6.5L5 3.5L7.5 6.5' : 'M2.5 3.5L5 6.5L7.5 3.5'}
                    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <>
                  <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                  <div style={{
                    position: 'absolute', top: 36, right: 0, zIndex: 100,
                    background: '#1d2235', border: '1px solid #2f3a54',
                    borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    minWidth: 160, overflow: 'hidden',
                  }}>
                    {[
                      { label: 'Fetch', action: doFetch, color: '#8b94b0', count: 0, icon: <FetchIcon /> },
                      { label: 'Pull',  action: doPull,  color: '#f5a832', count: sync?.behind ?? 0, icon: <ArrowDown /> },
                      { label: 'Push',  action: doPush,  color: '#2ec573', count: sync?.ahead  ?? 0, icon: <ArrowUp /> },
                    ].map((item, i, arr) => (
                      <button key={item.label}
                        onClick={() => { item.action(); setMenuOpen(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', height: 36, paddingLeft: 12, paddingRight: 12,
                          background: 'transparent', border: 'none',
                          borderBottom: i < arr.length - 1 ? '1px solid #252d42' : 'none',
                          color: item.count > 0 ? item.color : '#8b94b0',
                          fontFamily: "'IBM Plex Sans', system-ui", fontSize: 13, cursor: 'pointer',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#242a3d')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {item.icon}
                        <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                        {item.count > 0 && (
                          <span style={{
                            background: `${item.color}22`, color: item.color,
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
                            borderRadius: 10, paddingLeft: 6, paddingRight: 6,
                          }}>{item.count}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {repoPath && <div style={{ width: 1, height: 20, background: '#252d42', flexShrink: 0 }} />}

          {/* Notification bell */}
          <NotificationBell />

          {/* Account */}
          {currentAccount ? (
            <button
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                height: 34, paddingLeft: 8, paddingRight: 10,
                borderRadius: 6, border: '1px solid transparent',
                background: 'transparent', cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#242a3d'; e.currentTarget.style.borderColor = '#252d42' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
            >
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'linear-gradient(135deg, #4d9dff, #a27ef0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: '#fff',
                flexShrink: 0,
              }}>{initials}</span>
              <span style={{ fontFamily: "'IBM Plex Sans', system-ui", fontSize: 13, color: '#8b94b0', fontWeight: 500 }}>
                {currentAccount.login}
              </span>
            </button>
          ) : (
            <button onClick={onAddAccount} style={{
              height: 30, paddingLeft: 12, paddingRight: 12,
              borderRadius: 6, border: '1px solid #2f3a54',
              background: '#1d2235', color: '#8b94b0',
              fontFamily: "'IBM Plex Sans', system-ui", fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>
              Sign in
            </button>
          )}
        </div>
      </header>
    </>
  )
}

// ── Small inline components ─────────────────────────────────────────────────────

function TopBtn({ onClick, label, accent }: { onClick: () => void; label: string; accent?: boolean }) {
  return (
    <button onClick={onClick} style={{
      height: 30, paddingLeft: 14, paddingRight: 14, borderRadius: 6,
      background: accent ? '#e8622f' : '#1d2235',
      border: `1px solid ${accent ? '#e8622f' : '#2f3a54'}`,
      color: accent ? '#fff' : '#8b94b0',
      fontFamily: "'IBM Plex Sans', system-ui", fontSize: 13, fontWeight: accent ? 600 : 400, cursor: 'pointer',
    }}>{label}</button>
  )
}

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <path d="M4 2.5L7.5 6L4 9.5" stroke="#2f3a54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BranchIconSm() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="5" cy="4"  r="1.75" stroke="#4d9dff" strokeWidth="1.5" />
      <circle cx="5" cy="12" r="1.75" stroke="#4d9dff" strokeWidth="1.5" />
      <circle cx="11" cy="4" r="1.75" stroke="#4d9dff" strokeWidth="1.5" />
      <path d="M5 5.75V10.25" stroke="#4d9dff" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 5.75C5 7.5 11 7.5 11 5.75" stroke="#4d9dff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function FetchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M6.5 1v7M4 5.5l2.5 2.5L9 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 10.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function ArrowUp() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 9.5V2.5M3 5L6 2L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 2.5V9.5M3 7L6 10L9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WarnIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M6.5 2L12 11H1L6.5 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.5 6v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="6.5" cy="9.5" r="0.6" fill="currentColor" />
    </svg>
  )
}
