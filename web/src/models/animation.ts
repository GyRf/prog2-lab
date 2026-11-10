// MODELS: animaciones educativas como secuencias de pasos (datos puros).

export interface SlotView {
  name: string
  value?: string
  ref?: string // id de un objeto del heap
  changed?: boolean
}

export interface FrameView {
  name: string
  vars: SlotView[]
  active?: boolean
  error?: boolean
}

export interface HeapObjView {
  id: string
  cls: string
  fields: SlotView[]
  highlight?: boolean
  dim?: boolean
  tag?: string
}

export interface TreeView {
  label: string
  value?: string
  state?: 'idle' | 'visiting' | 'done'
  children?: TreeView[]
}

export interface CellView {
  label: string
  sub?: string
  state?: 'idle' | 'compare' | 'moved' | 'sorted'
}

export interface Scene {
  frames?: FrameView[]
  heap?: HeapObjView[]
  tree?: TreeView
  array?: CellView[]
  output?: string[]
}

export interface AnimStep {
  line: number // 1-based en el código mostrado
  note: string
  method?: string // método que se está ejecutando, ej: "Capitan.getSueldo()"
  scene: Scene
}

export interface AnimParam {
  name: string
  label: string
  options: { value: string; label: string }[]
  default: string
}

export interface AnimationDef {
  id: string
  title: string
  description: string
  concepts: string[]
  params: AnimParam[]
  code(params: Record<string, string>): string
  build(params: Record<string, string>): AnimStep[]
}
