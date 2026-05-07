import type { ThemeChoice } from '../lib/theme'

type Props = {
  memoryCount: number
  messageCount: number
  theme: ThemeChoice
  onThemeChange: (t: ThemeChoice) => void
  onExport: () => void
  onImportFile: (file: File) => void
  onSendData: () => void
  sendingData: boolean
  onReset: () => void
}

export function HeaderToolbar({
  memoryCount,
  messageCount,
  theme,
  onThemeChange,
  onExport,
  onImportFile,
  onSendData,
  sendingData,
  onReset,
}: Props) {
  return (
    <div className="header-toolbar">
      <div className="header-stats" aria-live="polite">
        <span title="Saved memories">{memoryCount} memories</span>
        <span className="sep" aria-hidden="true">
          ·
        </span>
        <span title="Messages in this chat">{messageCount} messages</span>
      </div>

      <div className="header-actions">
        <label className="field-inline">
          <span className="sr-only">Theme</span>
          <select
            className="theme-select"
            value={theme}
            onChange={(e) => onThemeChange(e.target.value as ThemeChoice)}
            aria-label="Color theme"
          >
            <option value="system">System theme</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>

        <button type="button" className="btn ghost sm" onClick={onExport}>
          Export backup
        </button>

        <button
          type="button"
          className="btn secondary sm"
          onClick={onSendData}
          disabled={sendingData}
          title="Send your persona data to the backend"
        >
          {sendingData ? 'Sending…' : 'Send data'}
        </button>

        <label className="btn ghost sm file-import-label">
          Import backup
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImportFile(f)
              e.target.value = ''
            }}
          />
        </label>

        <button
          type="button"
          className="btn danger sm"
          onClick={onReset}
          title="Remove all local data"
        >
          Reset data
        </button>
      </div>
    </div>
  )
}
