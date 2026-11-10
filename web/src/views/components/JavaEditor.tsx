import Editor, { DiffEditor, type OnMount } from '@monaco-editor/react'
import { useEffect, useRef } from 'react'
import type { Diagnostic, JavaFile } from '../../models/types'
import { useServices } from '../../services/AppServices'
import { monaco, registerJavaCompletions } from './monacoSetup'

// VIEW: editor Java (Monaco) con pestañas por archivo y marcadores de diagnósticos.

interface Props {
  files: JavaFile[] // editables + soporte (readonly)
  active: string
  onActive: (name: string) => void
  onChange: (name: string, content: string) => void
  diagnostics: Diagnostic[]
  onSave?: () => void
  onRun?: () => void
  onCompile?: () => void
  revealLine?: { file: string; line: number; n: number }
  height?: string
}

const SEV = { error: monaco.MarkerSeverity.Error, warning: monaco.MarkerSeverity.Warning, info: monaco.MarkerSeverity.Info }

export function JavaEditor({ files, active, onActive, onChange, diagnostics, onSave, onRun, onCompile, revealLine, height = '100%' }: Props) {
  const { theme } = useServices()
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const handlers = useRef({ onSave, onRun, onCompile })
  handlers.current = { onSave, onRun, onCompile }
  const file = files.find((f) => f.name === active) ?? files[0]

  useEffect(() => {
    const model = editorRef.current?.getModel()
    if (!model) return
    monaco.editor.setModelMarkers(model, 'prog2', diagnostics.filter((d) => !d.file || d.file === file.name).map((d) => ({
      severity: SEV[d.severity], message: `${d.title}: ${d.explanation}`, startLineNumber: d.line, endLineNumber: d.line, startColumn: 1, endColumn: model.getLineMaxColumn(Math.min(d.line, model.getLineCount())),
    })))
  }, [diagnostics, file.name, file.content])

  useEffect(() => {
    if (!revealLine || revealLine.file !== file.name || !editorRef.current) return
    editorRef.current.revealLineInCenter(revealLine.line)
    editorRef.current.setPosition({ lineNumber: revealLine.line, column: 1 })
    editorRef.current.focus()
  }, [revealLine, file.name])

  const onMount: OnMount = (ed) => {
    registerJavaCompletions()
    editorRef.current = ed
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => handlers.current.onSave?.())
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => handlers.current.onRun?.())
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyB, () => handlers.current.onCompile?.())
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div role="tablist" aria-label="Archivos" className="flex overflow-x-auto border-b text-sm" style={{ borderColor: 'var(--border)', background: 'var(--panel-2)' }}>
        {files.map((f) => {
          const errs = diagnostics.filter((d) => d.file === f.name && d.severity === 'error').length
          return (
            <button key={f.name} role="tab" aria-selected={f.name === file.name} onClick={() => onActive(f.name)} className="px-3 py-2 whitespace-nowrap border-r flex items-center gap-1.5" style={{ borderColor: 'var(--border)', background: f.name === file.name ? 'var(--panel)' : undefined, fontWeight: f.name === file.name ? 600 : 400 }}>
              {f.name}
              {f.readonly && <span className="text-[0.65rem] muted">(sólo lectura)</span>}
              {errs > 0 && <span className="chip !px-1.5" style={{ color: 'var(--err)', borderColor: 'var(--err)' }}>{errs}</span>}
            </button>
          )
        })}
      </div>
      <div className="flex-1 min-h-0" style={{ height }}>
        <Editor
          path={file.name}
          language="java"
          value={file.content}
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          onMount={onMount}
          onChange={(v) => !file.readonly && onChange(file.name, v ?? '')}
          options={{ readOnly: !!file.readonly, minimap: { enabled: false }, fontSize: 14, fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace', tabSize: 4, automaticLayout: true, scrollBeyondLastLine: false, autoIndent: 'full', formatOnType: true, wordWrap: 'off', ariaLabel: `Editor de ${file.name}` }}
        />
      </div>
    </div>
  )
}

export function JavaDiff({ original, modified, height = '420px' }: { original: string; modified: string; height?: string }) {
  const { theme } = useServices()
  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border" >
      <DiffEditor keepCurrentOriginalModel keepCurrentModifiedModel original={original} modified={modified} language="java" theme={theme === 'dark' ? 'vs-dark' : 'vs'} options={{ readOnly: true, renderSideBySide: true, minimap: { enabled: false }, automaticLayout: true, fontSize: 13 }} />
    </div>
  )
}
