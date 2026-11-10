// Dominios para la generación procedural. Cada uno define una hoja, un compuesto
// y atributos numéricos/texto con rangos coherentes.

export interface DomainField {
  name: string // nombre Java (camelCase)
  label: string // nombre en el enunciado
  type: 'int' | 'double' | 'String'
  range?: [number, number]
  /** Para Strings: valores posibles. */
  values?: string[]
}

export interface DomainDef {
  id: string
  name: string
  base: string // clase abstracta común
  leaf: string // hoja
  leafPlural: string
  composite: string // compuesto
  compositePlural: string
  compositeNames: string[]
  leafNames: string[]
  fields: DomainField[] // el primero siempre es "nombre"
  /** Campo numérico que tiene sentido sumar recursivamente. */
  sumField: string
  /** Campo numérico que tiene sentido maximizar recursivamente. */
  maxField: string
  /** Campo String usado en condiciones por igualdad. */
  categoryField: string
}

const nombre = (values: string[]): DomainField => ({ name: 'nombre', label: 'nombre', type: 'String', values })

export const DOMAINS: DomainDef[] = [
  {
    id: 'entregas', name: 'Entregas y contenedores', base: 'ElementoEnvio', leaf: 'Compra', leafPlural: 'compras', composite: 'Contenedor', compositePlural: 'contenedores',
    compositeNames: ['Pallet A', 'Camión Norte', 'Caja Grande', 'Depósito Sur', 'Pallet B'],
    leafNames: ['Heladera', 'Notebook', 'Silla', 'Lavarropas', 'Monitor', 'Bicicleta', 'Colchón', 'Microondas', 'Escritorio', 'Ventilador'],
    fields: [nombre([]), { name: 'peso', label: 'peso (kg)', type: 'double', range: [1, 80] }, { name: 'tiempoEntrega', label: 'tiempo de entrega (horas)', type: 'int', range: [2, 72] }, { name: 'ciudad', label: 'ciudad', type: 'String', values: ['Tandil', 'Azul', 'Olavarría', 'Tres Arroyos'] }, { name: 'precio', label: 'precio', type: 'int', range: [1000, 90000] }],
    sumField: 'peso', maxField: 'tiempoEntrega', categoryField: 'ciudad',
  },
  {
    id: 'onepiece', name: 'Personajes de One Piece', base: 'ElementoOnePiece', leaf: 'Personaje', leafPlural: 'personajes', composite: 'Tripulacion', compositePlural: 'tripulaciones',
    compositeNames: ['Sombrero de Paja', 'Piratas Heart', 'Piratas Kid', 'Barba Blanca', 'Piratas Rojos'],
    leafNames: ['Luffy', 'Zoro', 'Nami', 'Usopp', 'Sanji', 'Chopper', 'Robin', 'Franky', 'Brook', 'Jinbe', 'Law', 'Kid'],
    fields: [nombre([]), { name: 'fuerza', label: 'fuerza', type: 'int', range: [10, 999] }, { name: 'peso', label: 'peso (kg)', type: 'double', range: [40, 200] }, { name: 'edad', label: 'edad', type: 'int', range: [15, 60] }, { name: 'fruta', label: 'fruta del diablo', type: 'String', values: ['Paramecia', 'Zoan', 'Logia', 'Ninguna'] }],
    sumField: 'fuerza', maxField: 'edad', categoryField: 'fruta',
  },
  {
    id: 'pitufos', name: 'Pitufos y brigadas', base: 'ElementoPitufo', leaf: 'Pitufo', leafPlural: 'pitufos', composite: 'Brigada', compositePlural: 'brigadas',
    compositeNames: ['Brigada Azul', 'Equipo Seta', 'Brigada Bosque', 'Equipo Río', 'Brigada Luna'],
    leafNames: ['Fortachón', 'Filósofo', 'Bromista', 'Gruñón', 'Tímido', 'Goloso', 'Vanidoso', 'Poeta', 'Pintor', 'Dormilón', 'Granjero', 'Torpe'],
    fields: [nombre([]), { name: 'experiencia', label: 'experiencia', type: 'int', range: [1, 100] }, { name: 'velocidad', label: 'velocidad', type: 'int', range: [1, 50] }, { name: 'creatividad', label: 'creatividad', type: 'int', range: [1, 10] }, { name: 'peso', label: 'peso', type: 'double', range: [0.5, 3] }, { name: 'habilidad', label: 'habilidad principal', type: 'String', values: ['cocina', 'magia', 'construcción', 'música'] }],
    sumField: 'experiencia', maxField: 'velocidad', categoryField: 'habilidad',
  },
  {
    id: 'noticias', name: 'Noticias y secciones', base: 'ElementoNoticia', leaf: 'Noticia', leafPlural: 'noticias', composite: 'Seccion', compositePlural: 'secciones',
    compositeNames: ['Deportes', 'Política', 'Cultura', 'Economía', 'Ciencia'],
    leafNames: ['Final del torneo', 'Nueva ley', 'Festival de cine', 'Suba del dólar', 'Eclipse total', 'Récord mundial', 'Elecciones', 'Muestra de arte', 'Inflación', 'Vacuna nueva'],
    fields: [nombre([]), { name: 'visitas', label: 'cantidad de visitas', type: 'int', range: [10, 50000] }, { name: 'palabras', label: 'cantidad de palabras', type: 'int', range: [100, 3000] }, { name: 'editor', label: 'editor', type: 'String', values: ['Gómez', 'Pérez', 'Sosa', 'Ruiz'] }],
    sumField: 'visitas', maxField: 'palabras', categoryField: 'editor',
  },
  {
    id: 'coleccionables', name: 'Coleccionables', base: 'ElementoColeccion', leaf: 'Producto', leafPlural: 'productos', composite: 'Coleccion', compositePlural: 'colecciones',
    compositeNames: ['Figuras Retro', 'Cartas Raras', 'Monedas', 'Estampillas', 'Autos a escala'],
    leafNames: ['Figura dragón', 'Carta legendaria', 'Moneda 1890', 'Estampilla azul', 'Auto clásico', 'Muñeco robot', 'Carta holográfica', 'Moneda de plata', 'Llavero', 'Póster'],
    fields: [nombre([]), { name: 'precio', label: 'precio', type: 'int', range: [100, 50000] }, { name: 'peso', label: 'peso (g)', type: 'double', range: [5, 900] }, { name: 'anio', label: 'año', type: 'int', range: [1950, 2024] }, { name: 'rareza', label: 'rareza', type: 'String', values: ['común', 'rara', 'épica'] }],
    sumField: 'precio', maxField: 'anio', categoryField: 'rareza',
  },
  {
    id: 'cultivos', name: 'Cultivos y lotes', base: 'ElementoCampo', leaf: 'Cultivo', leafPlural: 'cultivos', composite: 'Lote', compositePlural: 'lotes',
    compositeNames: ['Lote Norte', 'Lote Sur', 'Parcela 3', 'Campo El Ombú', 'Lote Arroyo'],
    leafNames: ['Soja 1', 'Maíz 2', 'Trigo 1', 'Girasol', 'Cebada', 'Soja 2', 'Maíz 1', 'Avena', 'Sorgo', 'Trigo 2'],
    fields: [nombre([]), { name: 'hectareas', label: 'hectáreas', type: 'int', range: [5, 400] }, { name: 'rendimiento', label: 'rendimiento (tn/ha)', type: 'double', range: [1, 12] }, { name: 'especie', label: 'especie', type: 'String', values: ['soja', 'maíz', 'trigo', 'girasol'] }],
    sumField: 'hectareas', maxField: 'hectareas', categoryField: 'especie',
  },
  {
    id: 'presupuestos', name: 'Presupuestos y tareas', base: 'ElementoPresupuesto', leaf: 'Tarea', leafPlural: 'tareas', composite: 'Presupuesto', compositePlural: 'presupuestos',
    compositeNames: ['Reforma cocina', 'Baño', 'Pintura', 'Electricidad', 'Techo'],
    leafNames: ['Demolición', 'Revoque', 'Cableado', 'Plomería', 'Pintar paredes', 'Colocar cerámicos', 'Impermeabilizar', 'Instalar luces', 'Limpieza', 'Flete'],
    fields: [nombre([]), { name: 'costo', label: 'costo', type: 'int', range: [5000, 300000] }, { name: 'horas', label: 'horas de trabajo', type: 'int', range: [1, 80] }, { name: 'rubro', label: 'rubro', type: 'String', values: ['albañilería', 'electricidad', 'plomería', 'pintura'] }],
    sumField: 'costo', maxField: 'horas', categoryField: 'rubro',
  },
  {
    id: 'espectaculos', name: 'Espectáculos y compañías', base: 'ElementoEspectaculo', leaf: 'Artista', leafPlural: 'artistas', composite: 'Compania', compositePlural: 'compañías',
    compositeNames: ['Compañía Lunar', 'Circo del Sur', 'Teatro Abierto', 'Ballet Norte', 'Grupo Andén'],
    leafNames: ['Malabarista', 'Actriz', 'Bailarín', 'Mago', 'Cantante', 'Acróbata', 'Payaso', 'Pianista', 'Mimo', 'Narrador'],
    fields: [nombre([]), { name: 'cachet', label: 'cachet', type: 'int', range: [10000, 500000] }, { name: 'duracion', label: 'duración (minutos)', type: 'int', range: [5, 90] }, { name: 'disciplina', label: 'disciplina', type: 'String', values: ['circo', 'teatro', 'danza', 'música'] }],
    sumField: 'cachet', maxField: 'duracion', categoryField: 'disciplina',
  },
  {
    id: 'albumes', name: 'Álbumes y fotografías', base: 'ElementoAlbum', leaf: 'Fotografia', leafPlural: 'fotografías', composite: 'Album', compositePlural: 'álbumes',
    compositeNames: ['Vacaciones', 'Cumpleaños', 'Viaje al sur', 'Familia', 'Mascotas'],
    leafNames: ['playa', 'montaña', 'torta', 'perro', 'atardecer', 'ciudad', 'lago', 'abuela', 'gato', 'bosque'],
    fields: [nombre([]), { name: 'tamanio', label: 'tamaño (KB)', type: 'int', range: [200, 9000] }, { name: 'meGusta', label: 'cantidad de me gusta', type: 'int', range: [0, 900] }, { name: 'formato', label: 'formato', type: 'String', values: ['jpg', 'png', 'raw'] }],
    sumField: 'tamanio', maxField: 'meGusta', categoryField: 'formato',
  },
  {
    id: 'equipos', name: 'Equipos y jugadores', base: 'ElementoDeportivo', leaf: 'Jugador', leafPlural: 'jugadores', composite: 'Equipo', compositePlural: 'equipos',
    compositeNames: ['Los Halcones', 'Club Centro', 'Deportivo Sur', 'Atlético Norte', 'Unión'],
    leafNames: ['Martínez', 'Fernández', 'López', 'García', 'Romero', 'Díaz', 'Álvarez', 'Torres', 'Suárez', 'Acosta', 'Ramos', 'Molina'],
    fields: [nombre([]), { name: 'goles', label: 'goles', type: 'int', range: [0, 40] }, { name: 'edad', label: 'edad', type: 'int', range: [17, 38] }, { name: 'altura', label: 'altura (m)', type: 'double', range: [1.6, 2.0] }, { name: 'posicion', label: 'posición', type: 'String', values: ['arquero', 'defensor', 'mediocampista', 'delantero'] }],
    sumField: 'goles', maxField: 'edad', categoryField: 'posicion',
  },
  {
    id: 'archivos', name: 'Archivos y carpetas', base: 'ElementoFS', leaf: 'Archivo', leafPlural: 'archivos', composite: 'Carpeta', compositePlural: 'carpetas',
    compositeNames: ['docs', 'fotos', 'src', 'descargas', 'musica'],
    leafNames: ['informe', 'tp1', 'notas', 'foto1', 'cancion', 'main', 'readme', 'planilla', 'video', 'backup'],
    fields: [nombre([]), { name: 'tamanio', label: 'tamaño (KB)', type: 'int', range: [1, 5000] }, { name: 'extension', label: 'extensión', type: 'String', values: ['pdf', 'java', 'txt', 'mp3'] }],
    sumField: 'tamanio', maxField: 'tamanio', categoryField: 'extension',
  },
]

export const domainById = (id: string) => DOMAINS.find((d) => d.id === id)
