import type { AnimationDef, AnimStep, CellView, HeapObjView, Scene, TreeView } from '../models/animation'

// Cada animación genera sus pasos a partir de parámetros que el alumno puede cambiar.

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

/** Ayuda a construir pasos acumulando una escena mutable. */
function recorder(initial: Scene) {
  let scene = clone(initial)
  const steps: AnimStep[] = []
  return {
    get scene() { return scene },
    set(fn: (s: Scene) => void) { fn(scene) },
    push(line: number, note: string, method?: string) {
      steps.push({ line, note, method, scene: clone(scene) })
      // limpiar marcas de "cambiado" para el próximo paso
      scene = clone(scene)
      scene.heap?.forEach((o) => { o.highlight = false; o.fields.forEach((f) => (f.changed = false)) })
      scene.frames?.forEach((f) => f.vars.forEach((v) => (v.changed = false)))
    },
    steps,
  }
}

// ---------------------------------------------------------------------
const referencias: AnimationDef = {
  id: 'referencias', title: 'Referencias, objetos y aliasing', concepts: ['referencias', 'identidad-igualdad'],
  description: 'Las variables guardan referencias. Asignar una variable a otra no copia el objeto: crea un alias.',
  params: [{ name: 'edad', label: 'Edad asignada por b', options: ['5', '30', '120'].map((v) => ({ value: v, label: v })), default: '30' }],
  code: (p) => `Pitufo a = new Pitufo("Filósofo", 10);
Pitufo b = a;
b.setEdad(${p.edad});
System.out.println(a.getEdad());
a = new Pitufo("Poeta", 1);
System.out.println(b.getEdad());`,
  build(p) {
    const r = recorder({ frames: [{ name: 'main', vars: [], active: true }], heap: [], output: [] })
    r.set((s) => { s.heap!.push({ id: '#1', cls: 'Pitufo', fields: [{ name: 'nombre', value: '"Filósofo"' }, { name: 'edad', value: '10' }], highlight: true }); s.frames![0].vars.push({ name: 'a', ref: '#1', changed: true }) })
    r.push(1, 'new crea un objeto en el heap (#1). La variable a guarda una referencia a él.')
    r.set((s) => s.frames![0].vars.push({ name: 'b', ref: '#1', changed: true }))
    r.push(2, 'b = a copia la REFERENCIA, no el objeto: a y b apuntan al mismo Pitufo (aliasing).')
    r.set((s) => { const f = s.heap![0].fields[1]; f.value = p.edad; f.changed = true; s.heap![0].highlight = true })
    r.push(3, 'El mensaje se envía al objeto #1 a través de b.', 'Pitufo.setEdad(int)')
    r.set((s) => s.output!.push(p.edad))
    r.push(4, `Como a apunta al mismo objeto, ve el cambio: imprime ${p.edad}.`, 'Pitufo.getEdad()')
    r.set((s) => { s.heap!.push({ id: '#2', cls: 'Pitufo', fields: [{ name: 'nombre', value: '"Poeta"' }, { name: 'edad', value: '1' }], highlight: true }); s.frames![0].vars[0] = { name: 'a', ref: '#2', changed: true } })
    r.push(5, 'Reasignar a no modifica #1: sólo cambia a dónde apunta a. b sigue apuntando a #1.')
    r.set((s) => s.output!.push(p.edad))
    r.push(6, `b.getEdad() sigue siendo ${p.edad}.`, 'Pitufo.getEdad()')
    return r.steps
  },
}

// ---------------------------------------------------------------------
const identidad: AnimationDef = {
  id: 'identidad-igualdad', title: 'Identidad versus igualdad', concepts: ['identidad-igualdad'],
  description: '== pregunta si dos referencias apuntan al mismo objeto; equals compara contenido.',
  params: [{ name: 'crea', label: 'Cómo se crea s2', options: [{ value: 'new', label: 'new String("Luffy")' }, { value: 'lit', label: 'literal "Luffy"' }], default: 'new' }],
  code: (p) => `String s1 = new String("Luffy");
String s2 = ${p.crea === 'new' ? 'new String("Luffy")' : '"Luffy"'};
String s3 = s1;
System.out.println(s1 == s2);
System.out.println(s1.equals(s2));
System.out.println(s1 == s3);`,
  build() {
    const r = recorder({ frames: [{ name: 'main', vars: [], active: true }], heap: [], output: [] })
    r.set((s) => { s.heap!.push({ id: '#1', cls: 'String', fields: [{ name: 'valor', value: '"Luffy"' }], highlight: true }); s.frames![0].vars.push({ name: 's1', ref: '#1', changed: true }) })
    r.push(1, 's1 referencia un String nuevo (#1).')
    r.set((s) => { s.heap!.push({ id: '#2', cls: 'String', fields: [{ name: 'valor', value: '"Luffy"' }], highlight: true }); s.frames![0].vars.push({ name: 's2', ref: '#2', changed: true }) })
    r.push(2, 's2 referencia OTRO objeto (#2) con el mismo texto. (Un literal vive en el pool de Strings, pero igual es distinto de un objeto creado con new.)')
    r.set((s) => s.frames![0].vars.push({ name: 's3', ref: '#1', changed: true }))
    r.push(3, 's3 es un alias de s1: ambos apuntan a #1.')
    r.set((s) => s.output!.push('false'))
    r.push(4, '#1 y #2 son objetos distintos → s1 == s2 es false.')
    r.set((s) => { s.output!.push('true'); s.heap![0].highlight = true; s.heap![1].highlight = true })
    r.push(5, 'equals compara el contenido: "Luffy" y "Luffy" → true.', 'String.equals(Object)')
    r.set((s) => s.output!.push('true'))
    r.push(6, 's1 y s3 son la misma referencia → true.')
    return r.steps
  },
}

// ---------------------------------------------------------------------
const binding: AnimationDef = {
  id: 'binding-dinamico', title: 'Binding estático y dinámico', concepts: ['binding', 'polimorfismo', 'this-super'],
  description: 'El compilador valida contra el tipo estático; en ejecución el método se busca desde la clase real del objeto hacia arriba.',
  params: [{ name: 'tipo', label: 'Tipo dinámico de e', options: [{ value: 'Jugador', label: 'new Jugador(...)' }, { value: 'Capitan', label: 'new Capitan(...)' }], default: 'Capitan' }],
  code: (p) => `abstract class Empleado {
    abstract double getSueldo();
}
class Jugador extends Empleado {
    double getSueldo() { return basico + 1000 * goles; }
}
class Capitan extends Jugador {
    double getSueldo() { return super.getSueldo() * 1.2; }
}

Empleado e = new ${p.tipo}("Díaz", 10000, 2);
double s = e.getSueldo();`,
  build(p) {
    const cap = p.tipo === 'Capitan'
    const r = recorder({ frames: [{ name: 'main', vars: [], active: true }], heap: [], output: [] })
    r.set((s) => { s.heap!.push({ id: '#1', cls: p.tipo, tag: `tipo dinámico: ${p.tipo}`, fields: [{ name: 'basico', value: '10000' }, { name: 'goles', value: '2' }], highlight: true }); s.frames![0].vars.push({ name: 'e : Empleado', ref: '#1', changed: true }) })
    r.push(11, `Tipo estático de e: Empleado. Tipo dinámico: ${p.tipo}.`)
    r.push(12, 'COMPILACIÓN: ¿Empleado declara getSueldo()? Sí (abstracto) → compila. El compilador no sabe qué objeto habrá.')
    r.set((s) => s.frames!.unshift({ name: `${p.tipo}.getSueldo()`, vars: [{ name: 'this', ref: '#1' }], active: true }))
    r.push(cap ? 8 : 5, `EJECUCIÓN: se busca getSueldo empezando por la clase del objeto (${p.tipo}) → ${cap ? 'Capitan lo redefine' : 'Jugador lo implementa'}.`, `${p.tipo}.getSueldo()`)
    if (cap) {
      r.set((s) => s.frames!.unshift({ name: 'Jugador.getSueldo()', vars: [{ name: 'this', ref: '#1' }], active: true }))
      r.push(5, 'super.getSueldo() es binding ESTÁTICO: ejecuta la versión de la superclase directa (Jugador), sin buscar desde abajo.', 'Jugador.getSueldo()')
      r.set((s) => { s.frames!.shift(); s.frames![0].vars.push({ name: 'super.getSueldo()', value: '12000', changed: true }) })
      r.push(8, 'Jugador devuelve 10000 + 1000 × 2 = 12000. Capitan lo multiplica por 1.2.', 'Capitan.getSueldo()')
    }
    r.set((s) => { s.frames!.shift(); s.frames![0].vars.push({ name: 's', value: cap ? '14400.0' : '12000.0', changed: true }) })
    r.push(12, `Resultado: ${cap ? '14400.0' : '12000.0'}. El mismo mensaje produce resultados distintos según el objeto: polimorfismo.`)
    return r.steps
  },
}

// ---------------------------------------------------------------------
const polimorfica: AnimationDef = {
  id: 'llamada-polimorfica', title: 'Llamadas polimórficas en una lista', concepts: ['polimorfismo', 'interfaces'],
  description: 'Un mismo mensaje (area) enviado a cada elemento ejecuta el método de la clase de cada objeto.',
  params: [{ name: 'lista', label: 'Contenido de la lista', options: [{ value: 'RCR', label: 'Rectángulo, Círculo, Rectángulo' }, { value: 'CC', label: 'Círculo, Círculo' }, { value: 'RCT', label: 'Rectángulo, Círculo, Triángulo' }], default: 'RCR' }],
  code: () => `double total = 0;
for (Figura f : figuras) {
    total += f.area();
}`,
  build(p) {
    const defs: Record<string, { cls: string; f: string; area: number }> = { R: { cls: 'Rectangulo', f: 'base=3, altura=4', area: 12 }, C: { cls: 'Circulo', f: 'radio=1', area: 3.14 }, T: { cls: 'Triangulo', f: 'base=4, altura=2', area: 4 } }
    const items = p.lista.split('').map((k, i) => ({ ...defs[k], id: `#${i + 1}` }))
    const r = recorder({ frames: [{ name: 'main', vars: [{ name: 'total', value: '0' }], active: true }], heap: items.map((it) => ({ id: it.id, cls: it.cls, fields: [{ name: 'datos', value: it.f }] })), output: [] })
    r.push(1, `La lista contiene ${items.length} figuras de clases distintas, todas referenciadas como Figura.`)
    let total = 0
    items.forEach((it) => {
      r.set((s) => { s.frames![0].vars[1] = { name: 'f : Figura', ref: it.id, changed: true }; s.heap!.find((o) => o.id === it.id)!.highlight = true })
      r.push(2, `f apunta a ${it.id} (${it.cls}).`)
      total = Math.round((total + it.area) * 100) / 100
      r.set((s) => { s.frames![0].vars[0] = { name: 'total', value: String(total), changed: true }; s.heap!.find((o) => o.id === it.id)!.highlight = true })
      r.push(3, `f.area() ejecuta ${it.cls}.area() → ${it.area}. El for no pregunta el tipo: no hay instanceof.`, `${it.cls}.area()`)
    })
    r.push(4, `Total: ${total}. Agregar una figura nueva no requiere modificar este código.`)
    return r.steps
  },
}

// ---------------------------------------------------------------------
type T = { name: string; peso?: number; children?: T[] }
const TREES: Record<string, T> = {
  chico: { name: 'Camión', children: [{ name: 'Heladera', peso: 60 }, { name: 'Caja', children: [{ name: 'Monitor', peso: 5 }, { name: 'Silla', peso: 7 }] }] },
  profundo: { name: 'Depósito', children: [{ name: 'Pallet A', children: [{ name: 'Caja 1', children: [{ name: 'Notebook', peso: 2 }, { name: 'Ventilador', peso: 4 }] }, { name: 'Colchón', peso: 20 }] }, { name: 'Bicicleta', peso: 12 }, { name: 'Pallet B', children: [] }] },
}

function toView(t: T, state: Map<T, { st: TreeView['state']; v?: number }>): TreeView {
  const s = state.get(t)
  return { label: t.name + (t.children ? ' (Contenedor)' : ''), value: s?.v !== undefined ? String(s.v) : t.peso !== undefined ? `peso ${t.peso}` : undefined, state: s?.st ?? 'idle', children: t.children?.map((c) => toView(c, state)) }
}

const composite: AnimationDef = {
  id: 'composite', title: 'Recorrido recursivo de un Composite', concepts: ['composite', 'polimorfismo'],
  description: 'getPeso() en un contenedor pide getPeso() a cada hijo. Las hojas son el caso base.',
  params: [{ name: 'arbol', label: 'Estructura', options: [{ value: 'chico', label: 'Camión con una caja' }, { value: 'profundo', label: 'Depósito con 3 niveles (y un pallet vacío)' }], default: 'chico' }],
  code: () => `// Compra (hoja)
public double getPeso() {
    return peso;
}

// Contenedor (compuesto)
public double getPeso() {
    double total = 0;
    for (ElementoEnvio e : elementos) {
        total += e.getPeso();
    }
    return total;
}`,
  build(p) {
    const root = TREES[p.arbol]
    const state = new Map<T, { st: TreeView['state']; v?: number }>()
    const steps: AnimStep[] = []
    const stack: string[] = []
    const snap = (line: number, note: string, method?: string) => steps.push({ line, note, method, scene: { tree: toView(root, state), frames: stack.map((n, i) => ({ name: n, vars: [], active: i === 0 })) } })
    const visit = (t: T): number => {
      stack.unshift(`${t.children ? 'Contenedor' : 'Compra'}.getPeso() — ${t.name}`)
      state.set(t, { st: 'visiting' })
      if (!t.children) {
        snap(3, `${t.name} es una hoja: devuelve su peso (${t.peso}). Caso base.`, 'Compra.getPeso()')
        state.set(t, { st: 'done', v: t.peso })
        stack.shift()
        return t.peso!
      }
      snap(8, `${t.name} es un contenedor con ${t.children.length} elemento(s): total = 0.`, 'Contenedor.getPeso()')
      let total = 0
      for (const c of t.children) {
        snap(10, `${t.name} envía getPeso() a ${c.name} sin saber si es hoja o contenedor.`, 'Contenedor.getPeso()')
        total += visit(c)
        state.set(t, { st: 'visiting', v: total })
        snap(10, `${t.name} acumula: total = ${total}.`, 'Contenedor.getPeso()')
      }
      state.set(t, { st: 'done', v: total })
      snap(12, `${t.name} devuelve ${total}${t.children.length === 0 ? ' (contenedor vacío: el for no itera)' : ''}.`, 'Contenedor.getPeso()')
      stack.shift()
      return total
    }
    const total = visit(root)
    snap(12, `Peso total: ${total}. La recursión sale "sola" del binding dinámico.`)
    return steps
  },
}

// ---------------------------------------------------------------------
const copia: AnimationDef = {
  id: 'copia', title: 'Copia superficial versus profunda', concepts: ['copia-profunda', 'referencias'],
  description: 'Una copia superficial comparte los hijos con el original; una profunda crea objetos nuevos en todos los niveles.',
  params: [{ name: 'tipo', label: 'Tipo de copia', options: [{ value: 'sup', label: 'Superficial (addAll)' }, { value: 'prof', label: 'Profunda (copia de cada hijo)' }], default: 'sup' }],
  code: (p) => p.tipo === 'sup'
    ? `public Tripulacion copia() {
    Tripulacion t = new Tripulacion(nombre);
    t.elementos.addAll(this.elementos);
    return t;
}

Tripulacion c = original.copia();
original.getPersonaje("Luffy").setFuerza(999);`
    : `public Tripulacion copia() {
    Tripulacion t = new Tripulacion(nombre);
    for (ElementoOnePiece e : elementos)
        t.agregar(e.copia());
    return t;
}

Tripulacion c = original.copia();
original.getPersonaje("Luffy").setFuerza(999);`,
  build(p) {
    const sup = p.tipo === 'sup'
    const heap: HeapObjView[] = [
      { id: '#1', cls: 'Tripulacion', fields: [{ name: 'nombre', value: '"Sombrero de Paja"' }, { name: 'elementos[0]', ref: '#2' }, { name: 'elementos[1]', ref: '#3' }] },
      { id: '#2', cls: 'Personaje', fields: [{ name: 'nombre', value: '"Luffy"' }, { name: 'fuerza', value: '500' }] },
      { id: '#3', cls: 'Personaje', fields: [{ name: 'nombre', value: '"Zoro"' }, { name: 'fuerza', value: '450' }] },
    ]
    const r = recorder({ frames: [{ name: 'main', vars: [{ name: 'original', ref: '#1' }], active: true }], heap, output: [] })
    r.push(7, 'Estado inicial: una tripulación con dos personajes.')
    r.set((s) => { s.heap!.push({ id: '#4', cls: 'Tripulacion', fields: [{ name: 'nombre', value: '"Sombrero de Paja"' }], highlight: true }); s.frames!.unshift({ name: 'Tripulacion.copia()', vars: [{ name: 't', ref: '#4', changed: true }], active: true }) })
    r.push(2, 'Se crea una tripulación nueva (#4).', 'Tripulacion.copia()')
    if (sup) {
      r.set((s) => { const t = s.heap!.find((o) => o.id === '#4')!; t.fields.push({ name: 'elementos[0]', ref: '#2', changed: true }, { name: 'elementos[1]', ref: '#3', changed: true }); t.highlight = true })
      r.push(3, 'addAll copia las REFERENCIAS: #4 apunta a los mismos personajes #2 y #3.', 'Tripulacion.copia()')
    } else {
      r.set((s) => { s.heap!.push({ id: '#5', cls: 'Personaje', fields: [{ name: 'nombre', value: '"Luffy"' }, { name: 'fuerza', value: '500' }], highlight: true }); s.heap!.find((o) => o.id === '#4')!.fields.push({ name: 'elementos[0]', ref: '#5', changed: true }) })
      r.push(4, 'e.copia() sobre Luffy crea un Personaje nuevo (#5).', 'Personaje.copia()')
      r.set((s) => { s.heap!.push({ id: '#6', cls: 'Personaje', fields: [{ name: 'nombre', value: '"Zoro"' }, { name: 'fuerza', value: '450' }], highlight: true }); s.heap!.find((o) => o.id === '#4')!.fields.push({ name: 'elementos[1]', ref: '#6', changed: true }) })
      r.push(4, 'Lo mismo con Zoro (#6). Si un hijo fuera otra Tripulacion, su copia() repetiría el proceso.', 'Personaje.copia()')
    }
    r.set((s) => { s.frames!.shift(); s.frames![0].vars.push({ name: 'c', ref: '#4', changed: true }) })
    r.push(7, 'c referencia la copia.')
    r.set((s) => { const l = s.heap!.find((o) => o.id === '#2')!; l.fields[1] = { name: 'fuerza', value: '999', changed: true }; l.highlight = true })
    r.push(8, sup ? '¡Cambiar a Luffy en el original también cambia la copia! Ambas comparten #2: copia superficial.' : 'Sólo cambia #2. La copia tiene su propio Luffy (#5) con fuerza 500: copia profunda.')
    return r.steps
  },
}

// ---------------------------------------------------------------------
const strategy: AnimationDef = {
  id: 'strategy', title: 'Strategy intercambiable', concepts: ['strategy', 'polimorfismo'],
  description: 'El contexto delega en el objeto estrategia actual; cambiarla cambia el comportamiento sin tocar el contexto.',
  params: [{ name: 'segunda', label: 'Estrategia nueva', options: [{ value: 'Descuento', label: 'PrecioConDescuento (−20%)' }, { value: 'Peso', label: 'PrecioPorPeso (×3 por gramo)' }], default: 'Descuento' }],
  code: (p) => `Producto prod = new Producto("Figura dragón", 1000, 50);
prod.setCalculo(new PrecioBase());
prod.getPrecio();
prod.setCalculo(new ${p.segunda === 'Descuento' ? 'PrecioConDescuento(20)' : 'PrecioPorPeso(3)'});
prod.getPrecio();

// en Producto:
public double getPrecio() { return calculo.calcular(this); }`,
  build(p) {
    const second = p.segunda === 'Descuento' ? { cls: 'PrecioConDescuento', f: 'porcentaje=20', v: '800.0', why: '1000 × 0.8' } : { cls: 'PrecioPorPeso', f: 'factor=3', v: '150.0', why: '50 g × 3' }
    const r = recorder({ frames: [{ name: 'main', vars: [], active: true }], heap: [], output: [] })
    r.set((s) => { s.heap!.push({ id: '#1', cls: 'Producto', fields: [{ name: 'precioBase', value: '1000' }, { name: 'peso', value: '50' }, { name: 'calculo', value: 'null' }], highlight: true }); s.frames![0].vars.push({ name: 'prod', ref: '#1' }) })
    r.push(1, 'Producto con precio base 1000 y peso 50.')
    r.set((s) => { s.heap!.push({ id: '#2', cls: 'PrecioBase', fields: [], highlight: true }); s.heap![0].fields[2] = { name: 'calculo : CalculoPrecio', ref: '#2', changed: true } })
    r.push(2, 'El producto guarda la estrategia como CalculoPrecio (interfaz).')
    r.set((s) => s.output!.push('1000.0'))
    r.push(8, 'getPrecio delega: calculo.calcular(this) → PrecioBase devuelve 1000.', 'PrecioBase.calcular(Producto)')
    r.set((s) => { s.heap!.push({ id: '#3', cls: second.cls, fields: [{ name: second.f.split('=')[0], value: second.f.split('=')[1] }], highlight: true }); s.heap![0].fields[2] = { name: 'calculo : CalculoPrecio', ref: '#3', changed: true }; s.heap![1].dim = true })
    r.push(4, `Se cambia la estrategia en ejecución: ahora calculo apunta a ${second.cls}.`)
    r.set((s) => s.output!.push(second.v))
    r.push(8, `El MISMO getPrecio ahora ejecuta ${second.cls}.calcular → ${second.why} = ${second.v}. Producto no cambió.`, `${second.cls}.calcular(Producto)`)
    return r.steps
  },
}

// ---------------------------------------------------------------------
const DATASETS: Record<string, { n: string; e: number }[]> = {
  a: [{ n: 'Tímido', e: 30 }, { n: 'Fortachón', e: 90 }, { n: 'Bromista', e: 30 }, { n: 'Poeta', e: 60 }],
  b: [{ n: 'Gruñón', e: 10 }, { n: 'Goloso', e: 70 }, { n: 'Pintor', e: 70 }, { n: 'Torpe', e: 5 }, { n: 'Filósofo', e: 40 }],
}

const comparator: AnimationDef = {
  id: 'comparator', title: 'Ejecución de un Comparator', concepts: ['comparator'],
  description: 'Un algoritmo de ordenamiento (aquí, inserción) llama a compare(a, b) y usa sólo el signo del resultado.',
  params: [
    { name: 'datos', label: 'Datos', options: [{ value: 'a', label: '4 pitufos (con empate)' }, { value: 'b', label: '5 pitufos (con empate)' }], default: 'a' },
    { name: 'orden', label: 'Criterio', options: [{ value: 'desc', label: 'Mayor experiencia primero, luego nombre' }, { value: 'asc', label: 'Menor experiencia primero, luego nombre' }], default: 'desc' },
  ],
  code: (p) => `public int compare(Pitufo p1, Pitufo p2) {
    int res = Integer.compare(${p.orden === 'desc' ? 'p2.getExperiencia(), p1.getExperiencia()' : 'p1.getExperiencia(), p2.getExperiencia()'});
    if (res == 0) {
        res = p1.getNombre().compareTo(p2.getNombre());
    }
    return res;
}`,
  build(p) {
    const data = [...DATASETS[p.datos]]
    const cmp = (a: { n: string; e: number }, b: { n: string; e: number }) => {
      const r = p.orden === 'desc' ? Math.sign(b.e - a.e) : Math.sign(a.e - b.e)
      return r !== 0 ? { r, tie: false } : { r: a.n < b.n ? -1 : a.n > b.n ? 1 : 0, tie: true }
    }
    const steps: AnimStep[] = []
    const view = (hi: number[] = [], st: CellView['state'] = 'compare', sorted = 0): CellView[] => data.map((d, i) => ({ label: d.n, sub: `exp ${d.e}`, state: hi.includes(i) ? st : i < sorted ? 'sorted' : 'idle' }))
    steps.push({ line: 1, note: 'Lista inicial. El algoritmo irá insertando cada elemento en su lugar comparando con los anteriores.', scene: { array: view() } })
    for (let i = 1; i < data.length; i++) {
      let j = i
      while (j > 0) {
        const { r, tie } = cmp(data[j - 1], data[j])
        steps.push({ line: tie ? 4 : 2, method: 'ComparadorPorExperiencia.compare', note: `compare(${data[j - 1].n}, ${data[j].n}) = ${r > 0 ? 'positivo' : r < 0 ? 'negativo' : '0'}${tie ? ' (empate de experiencia → desempata por nombre)' : ''}. ${r > 0 ? `${data[j - 1].n} va DESPUÉS: se intercambian.` : 'Ya están en orden.'}`, scene: { array: view([j - 1, j], 'compare', i) } })
        if (r <= 0) break
        ;[data[j - 1], data[j]] = [data[j], data[j - 1]]
        steps.push({ line: 6, note: `Intercambio: ${data[j - 1].n} queda antes que ${data[j].n}.`, scene: { array: view([j - 1, j], 'moved', i) } })
        j--
      }
    }
    steps.push({ line: 6, note: 'Lista ordenada. compare nunca miró posiciones ni "ordenó": sólo dijo quién va antes.', scene: { array: data.map((d) => ({ label: d.n, sub: `exp ${d.e}`, state: 'sorted' })) } })
    return steps
  },
}

// ---------------------------------------------------------------------
const excepciones: AnimationDef = {
  id: 'excepciones', title: 'Propagación de excepciones', concepts: ['excepciones'],
  description: 'Una excepción no capturada desapila métodos hasta encontrar un catch compatible. finally siempre se ejecuta.',
  params: [{ name: 'monto', label: 'Monto a transferir (saldo 100)', options: [{ value: '40', label: '40 (alcanza)' }, { value: '500', label: '500 (no alcanza)' }], default: '500' }],
  code: (p) => `void main() {
    try {
        a.transferir(b, ${p.monto});
        System.out.println("OK");
    } catch (SaldoInsuficienteException e) {
        System.out.println("Error: " + e.getMessage());
    } finally {
        System.out.println("Fin");
    }
}
void transferir(Cuenta d, double m) throws SaldoInsuficienteException {
    extraer(m);
    d.depositar(m);
}
void extraer(double m) throws SaldoInsuficienteException {
    if (m > saldo) throw new SaldoInsuficienteException("saldo 100");
    saldo -= m;
}`,
  build(p) {
    const fail = Number(p.monto) > 100
    const r = recorder({ frames: [{ name: 'main()', vars: [], active: true }], heap: [{ id: '#a', cls: 'Cuenta a', fields: [{ name: 'saldo', value: '100' }] }, { id: '#b', cls: 'Cuenta b', fields: [{ name: 'saldo', value: '0' }] }], output: [] })
    r.push(3, 'main entra al bloque try y llama a transferir.')
    r.set((s) => { s.frames![0].active = false; s.frames!.unshift({ name: 'transferir(b, ' + p.monto + ')', vars: [{ name: 'm', value: p.monto }], active: true }) })
    r.push(12, 'Se apila transferir y llama a extraer.', 'Cuenta.transferir')
    r.set((s) => { s.frames![0].active = false; s.frames!.unshift({ name: 'extraer(' + p.monto + ')', vars: [{ name: 'm', value: p.monto }], active: true }) })
    r.push(16, `¿${p.monto} > 100? ${fail ? 'Sí' : 'No'}.`, 'Cuenta.extraer')
    if (fail) {
      r.set((s) => { s.frames![0].error = true })
      r.push(16, 'throw: se crea la excepción y extraer termina abruptamente (saldo no se modifica).', 'Cuenta.extraer')
      r.set((s) => { s.frames!.shift(); s.frames![0].error = true; s.frames![0].active = true })
      r.push(12, 'transferir no tiene catch: la excepción se propaga y d.depositar(m) NUNCA se ejecuta.', 'Cuenta.transferir')
      r.set((s) => { s.frames!.shift(); s.frames![0].active = true; s.output!.push('Error: saldo 100') })
      r.push(6, 'main tiene un catch compatible: se ejecuta. "OK" no se imprimió.')
    } else {
      r.set((s) => { s.heap![0].fields[0] = { name: 'saldo', value: String(100 - Number(p.monto)), changed: true } })
      r.push(17, 'Se descuenta el monto.', 'Cuenta.extraer')
      r.set((s) => { s.frames!.shift(); s.frames![0].active = true; s.heap![1].fields[0] = { name: 'saldo', value: p.monto, changed: true } })
      r.push(13, 'extraer termina normal; transferir deposita en b.', 'Cuenta.transferir')
      r.set((s) => { s.frames!.shift(); s.frames![0].active = true; s.output!.push('OK') })
      r.push(4, 'Sin excepción: se ejecuta el resto del try. El catch se saltea.')
    }
    r.set((s) => s.output!.push('Fin'))
    r.push(8, 'finally se ejecuta SIEMPRE, haya habido excepción o no.')
    return r.steps
  },
}

// ---------------------------------------------------------------------
const relaciones: AnimationDef = {
  id: 'relaciones', title: 'Asociación, agregación y composición', concepts: ['relaciones'],
  description: 'La diferencia está en el ciclo de vida: ¿qué pasa con las partes cuando desaparece el todo?',
  params: [{ name: 'rel', label: 'Relación', options: [{ value: 'asoc', label: 'Asociación (Pedido → Cliente)' }, { value: 'agreg', label: 'Agregación (Equipo ◇ Jugador)' }, { value: 'comp', label: 'Composición (Factura ◆ Línea)' }], default: 'comp' }],
  code: (p) => ({
    asoc: `Cliente c = new Cliente("Ana");
Pedido p = new Pedido(c);   // el pedido CONOCE al cliente
p = null;                   // el pedido deja de existir
// c sigue existiendo y puede tener otros pedidos`,
    agreg: `Jugador j = new Jugador("Romero");
Equipo e = new Equipo();
e.agregar(j);               // el equipo AGRUPA jugadores creados afuera
e = null;                   // el equipo deja de existir
// j sigue existiendo: puede pasar a otro equipo`,
    comp: `Factura f = new Factura();
f.agregarLinea("Monitor", 2); // la factura CREA sus líneas
f = null;                     // la factura deja de existir
// las líneas no tienen sentido solas: se van con ella`,
  })[p.rel]!,
  build(p) {
    const cfg = {
      asoc: { whole: 'Pedido', part: 'Cliente', partName: '"Ana"', field: 'cliente', survive: true, created: 'afuera' },
      agreg: { whole: 'Equipo', part: 'Jugador', partName: '"Romero"', field: 'jugadores[0]', survive: true, created: 'afuera' },
      comp: { whole: 'Factura', part: 'LineaFactura', partName: '"Monitor x2"', field: 'lineas[0]', survive: false, created: 'adentro' },
    }[p.rel]!
    const r = recorder({ frames: [{ name: 'main', vars: [], active: true }], heap: [], output: [] })
    if (cfg.created === 'afuera') {
      r.set((s) => { s.heap!.push({ id: '#1', cls: cfg.part, fields: [{ name: 'nombre', value: cfg.partName }], highlight: true }); s.frames![0].vars.push({ name: cfg.part.toLowerCase(), ref: '#1' }) })
      r.push(1, `${cfg.part} se crea por su cuenta, fuera del ${cfg.whole}.`)
      r.set((s) => { s.heap!.push({ id: '#2', cls: cfg.whole, fields: [{ name: cfg.field, ref: '#1', changed: true }], highlight: true }); s.frames![0].vars.push({ name: cfg.whole.toLowerCase(), ref: '#2' }) })
      r.push(p.rel === 'asoc' ? 2 : 3, `${cfg.whole} guarda una referencia a un ${cfg.part} que ya existía.`)
    } else {
      r.set((s) => { s.heap!.push({ id: '#2', cls: cfg.whole, fields: [], highlight: true }); s.frames![0].vars.push({ name: 'factura', ref: '#2' }) })
      r.push(1, 'Se crea la factura.')
      r.set((s) => { s.heap!.push({ id: '#1', cls: cfg.part, fields: [{ name: 'detalle', value: cfg.partName }], highlight: true }); s.heap![0].fields.push({ name: cfg.field, ref: '#1', changed: true }) })
      r.push(2, 'La propia factura crea la línea: nadie más la referencia.')
    }
    r.set((s) => { const v = s.frames![0].vars.find((v) => v.ref === '#2')!; v.ref = undefined; v.value = 'null'; v.changed = true; s.heap!.find((o) => o.id === '#2')!.dim = true })
    r.push(p.rel === 'comp' ? 3 : 4, `Ya nadie referencia al ${cfg.whole}: el recolector de basura puede liberarlo.`)
    r.set((s) => { if (!cfg.survive) s.heap!.find((o) => o.id === '#1')!.dim = true; else s.heap!.find((o) => o.id === '#1')!.highlight = true })
    r.push(p.rel === 'comp' ? 4 : 5, cfg.survive ? `${cfg.part} sobrevive porque main lo sigue referenciando: su vida es independiente.` : 'La línea sólo era alcanzable desde la factura: desaparece con ella. Eso es composición.')
    return r.steps
  },
}

// ---------------------------------------------------------------------
const herenciaComp: AnimationDef = {
  id: 'herencia-vs-composicion', title: 'Herencia versus composición', concepts: ['composicion-vs-herencia', 'herencia'],
  description: 'Heredar de una colección expone toda su interfaz; componer permite decidir qué se expone.',
  params: [{ name: 'diseno', label: 'Diseño', options: [{ value: 'her', label: 'class Brigada extends ArrayList<Pitufo>' }, { value: 'comp', label: 'class Brigada { private List<Pitufo> pitufos; }' }], default: 'her' }],
  code: (p) => p.diseno === 'her'
    ? `public class Brigada extends ArrayList<Pitufo> {
    public int getExperiencia() { ... }
}

Brigada b = new Brigada();
b.add(fortachon);
b.clear();          // ¡compila! cualquiera vacía la brigada
b.set(0, null);     // ¡compila! rompe getExperiencia`
    : `public class Brigada {
    private final List<Pitufo> pitufos = new ArrayList<>();
    public void agregar(Pitufo p) { pitufos.add(p); }
    public int getExperiencia() { ... }
}

Brigada b = new Brigada();
b.agregar(fortachon);
b.clear();          // NO compila: Brigada no expone clear`,
  build(p) {
    const her = p.diseno === 'her'
    const methods = her ? ['add, addAll, remove, clear', 'set, sort, removeIf, subList', '...40 métodos más', 'getExperiencia'] : ['agregar', 'getExperiencia']
    const r = recorder({ frames: [{ name: 'main', vars: [], active: true }], heap: [], output: [] })
    r.set((s) => { s.heap!.push({ id: '#1', cls: 'Brigada', tag: her ? 'ES UNA ArrayList' : 'TIENE una List', fields: methods.map((m) => ({ name: 'público', value: m })), highlight: true }); if (!her) s.heap!.push({ id: '#2', cls: 'ArrayList<Pitufo>', tag: 'privada', fields: [{ name: 'tamaño', value: '0' }] }); s.frames![0].vars.push({ name: 'b', ref: '#1' }) })
    r.push(her ? 5 : 7, her ? 'Brigada hereda TODA la interfaz pública de ArrayList.' : 'Brigada sólo expone los métodos que decidió; la lista es un detalle interno.')
    r.set((s) => { if (!her) s.heap![1].fields[0] = { name: 'tamaño', value: '1', changed: true }; else s.heap![0].highlight = true })
    r.push(her ? 6 : 8, her ? 'add funciona, pero no pasa por ninguna validación de Brigada.' : 'agregar delega en la lista interna (y podría validar).')
    r.push(her ? 7 : 9, her ? 'clear() y set() también están disponibles: el cliente puede dejar la brigada en un estado inválido. Una Brigada no "es una" lista.' : 'clear() no existe en Brigada: error de compilación. La composición protege los invariantes.')
    return r.steps
  },
}

export const ANIMATIONS: AnimationDef[] = [referencias, identidad, binding, polimorfica, composite, copia, strategy, comparator, excepciones, relaciones, herenciaComp]
export const animationById = (id: string) => ANIMATIONS.find((a) => a.id === id)
