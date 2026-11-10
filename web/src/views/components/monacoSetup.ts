import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import { loader } from '@monaco-editor/react'

// Monaco empaquetado localmente (sin CDN) y autocompletado básico de Java.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() }
loader.config({ monaco })

const KEYWORDS = ['abstract', 'boolean', 'break', 'case', 'catch', 'class', 'continue', 'default', 'do', 'double', 'else', 'extends', 'final', 'finally', 'for', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'new', 'null', 'private', 'protected', 'public', 'return', 'static', 'super', 'switch', 'this', 'throw', 'throws', 'try', 'void', 'while', 'true', 'false']
const TYPES = ['String', 'List', 'ArrayList', 'Set', 'HashSet', 'Map', 'HashMap', 'Comparator', 'Comparable', 'Collections', 'Objects', 'Iterator', 'Iterable', 'Integer', 'Double', 'Math', 'Exception', 'RuntimeException', 'IllegalArgumentException', 'IllegalStateException', 'Optional']

const SNIPPETS: { label: string; doc: string; text: string }[] = [
  { label: 'compare', doc: 'Método compare de Comparator', text: '@Override\npublic int compare(${1:T} o1, ${1:T} o2) {\n\tint res = ${2:Integer}.compare(o1.${3:get}(), o2.${3:get}());\n\tif (res == 0) {\n\t\tres = o1.getNombre().compareTo(o2.getNombre());\n\t}\n\treturn res;\n}' },
  { label: 'equals', doc: 'Redefinición de equals', text: '@Override\npublic boolean equals(Object o) {\n\tif (this == o) return true;\n\tif (o == null || getClass() != o.getClass()) return false;\n\t${1:Clase} otro = (${1:Clase}) o;\n\treturn ${2:nombre}.equals(otro.${2:nombre});\n}' },
  { label: 'hashCode', doc: 'Redefinición de hashCode', text: '@Override\npublic int hashCode() {\n\treturn Objects.hash(${1:nombre});\n}' },
  { label: 'fori', doc: 'for-each sobre una colección', text: 'for (${1:Elemento} ${2:e} : ${3:elementos}) {\n\t$0\n}' },
  { label: 'override', doc: 'Método redefinido', text: '@Override\npublic ${1:void} ${2:metodo}(${3}) {\n\t$0\n}' },
  { label: 'trycatch', doc: 'try / catch', text: 'try {\n\t$1\n} catch (${2:Excepcion} e) {\n\t$0\n}' },
]

let registered = false
export function registerJavaCompletions() {
  if (registered) return
  registered = true
  monaco.languages.registerCompletionItemProvider('java', {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position)
      const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn)
      const K = monaco.languages.CompletionItemKind
      const identifiers = [...new Set(model.getValue().match(/\b[a-zA-Z_]\w{2,}\b/g) ?? [])].filter((w) => !KEYWORDS.includes(w) && !TYPES.includes(w))
      return {
        suggestions: [
          ...KEYWORDS.map((k) => ({ label: k, kind: K.Keyword, insertText: k, range })),
          ...TYPES.map((t) => ({ label: t, kind: K.Class, insertText: t, range })),
          ...identifiers.map((t) => ({ label: t, kind: K.Variable, insertText: t, range })),
          ...SNIPPETS.map((s) => ({ label: s.label, kind: K.Snippet, documentation: s.doc, insertText: s.text, insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range })),
        ],
      }
    },
  })
}

export { monaco }

// Sólo en desarrollo: permite que los tests e2e manipulen el editor.
if (import.meta.env.DEV) (window as unknown as { monaco: typeof monaco }).monaco = monaco
