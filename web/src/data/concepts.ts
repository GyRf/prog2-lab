import type { Concept, Unit } from '../models/types'

export const UNITS: Unit[] = [
  { id: 'u1', title: 'Fundamentos de POO', description: 'Objetos, clases, estado, comportamiento, mensajes, identidad e igualdad, encapsulamiento.' },
  { id: 'u2', title: 'Anatomía de clases y herencia', description: 'Herencia, redefinición, visibilidad, constructores, abstractas, interfaces, relaciones entre clases, Template Method.' },
  { id: 'u3', title: 'Conceptos avanzados', description: 'Polimorfismo, binding dinámico, interfaces como contratos y excepciones.' },
  { id: 'u4', title: 'Patrones de diseño', description: 'Composite, Strategy, Decorator, State, Observer, Iterator, Comparator, condiciones combinables y copia profunda.' },
  { id: 'u5', title: 'Buenas y malas prácticas', description: 'Detectar y corregir problemas de diseño frecuentes en parciales.' },
]

const c = (unit: Concept['unit'], id: string, name: string, summary: string): Concept => ({ id, unit, name, summary })

export const CONCEPTS: Concept[] = [
  // U1
  c('u1', 'objetos-clases', 'Objetos y clases', 'Una clase describe estado y comportamiento; un objeto es una instancia concreta.'),
  c('u1', 'estado-comportamiento', 'Estado y comportamiento', 'Variables de instancia (estado) y métodos (comportamiento).'),
  c('u1', 'mensajes', 'Mensajes y métodos', 'Los objetos colaboran enviándose mensajes; el receptor decide qué método ejecutar.'),
  c('u1', 'identidad-igualdad', 'Identidad e igualdad', '== compara referencias; equals compara contenido según el contrato definido.'),
  c('u1', 'encapsulamiento', 'Encapsulamiento', 'Ocultar el estado interno y exponer comportamiento.'),
  c('u1', 'responsabilidades', 'Responsabilidades', 'Cada objeto es responsable de lo que sabe y lo que hace. Relación cliente-servidor.'),
  c('u1', 'referencias', 'Referencias y aliasing', 'Varias variables pueden referenciar al mismo objeto.'),
  // U2
  c('u2', 'herencia', 'Herencia', 'Generalización y especialización: la subclase es un tipo de la superclase.'),
  c('u2', 'redefinicion', 'Redefinición y sobrecarga', '@Override reemplaza comportamiento heredado; la sobrecarga cambia la firma.'),
  c('u2', 'this-super', 'this y super', 'this refiere al objeto actual; super invoca la implementación de la superclase.'),
  c('u2', 'visibilidad', 'Visibilidad', 'private, protected, public y package-private.'),
  c('u2', 'constructores', 'Constructores', 'Inicializan el estado; encadenamiento con this(...) y super(...).'),
  c('u2', 'static', 'Variables y métodos de clase', 'static pertenece a la clase, no a cada instancia.'),
  c('u2', 'relaciones', 'Asociación, agregación y composición', 'Grados de dependencia y ciclo de vida entre objetos relacionados.'),
  c('u2', 'abstractas', 'Clases y métodos abstractos', 'Definen un protocolo común que las subclases concretas completan.'),
  c('u2', 'template-method', 'Template Method y hooks', 'Un método base fija el algoritmo y delega pasos variables en subclases.'),
  c('u2', 'interfaces', 'Interfaces', 'Contratos que varias clases pueden cumplir; herencia múltiple de tipo.'),
  c('u2', 'composicion-vs-herencia', 'Composición frente a herencia', 'Preferir delegación cuando no hay relación "es-un" real.'),
  // U3
  c('u3', 'polimorfismo', 'Polimorfismo', 'Un mismo mensaje produce comportamiento distinto según el receptor.'),
  c('u3', 'binding', 'Binding estático y dinámico', 'El compilador chequea con el tipo estático; en ejecución se elige el método del tipo dinámico.'),
  c('u3', 'sustitucion', 'Principio de sustitución', 'Una subclase debe poder usarse donde se espera la superclase sin romper el contrato.'),
  c('u3', 'excepciones', 'Excepciones', 'try, catch, finally, throw y throws; checked vs unchecked; propagación.'),
  c('u3', 'diseno-excepciones', 'Diseño de excepciones', 'Excepciones de dominio, validación y cuándo capturar o propagar.'),
  // U4
  c('u4', 'composite', 'Composite', 'Hojas y compuestos tratados de forma uniforme; cálculos recursivos.'),
  c('u4', 'composite-busqueda', 'Composite con búsqueda', 'Recorrido recursivo que junta los elementos que cumplen una condición.'),
  c('u4', 'copia-profunda', 'Copia profunda', 'Duplicar la estructura completa sin compartir objetos mutables.'),
  c('u4', 'condiciones', 'Condiciones combinables', 'Condiciones como objetos, combinables con And, Or y Not.'),
  c('u4', 'strategy', 'Strategy', 'Encapsular algoritmos intercambiables detrás de una interfaz.'),
  c('u4', 'decorator', 'Decorator', 'Agregar responsabilidades envolviendo un objeto con la misma interfaz.'),
  c('u4', 'state', 'State', 'El comportamiento cambia según el objeto estado actual.'),
  c('u4', 'observer', 'Observer', 'Un sujeto notifica a sus observadores cuando cambia.'),
  c('u4', 'iterator', 'Iterator', 'Recorrer una colección sin exponer su estructura interna.'),
  c('u4', 'comparator', 'Comparator', 'Criterio de orden externo: compare(a, b) negativo, cero o positivo.'),
  c('u4', 'comparable', 'Comparable', 'Orden natural: compareTo dentro de la propia clase.'),
  // U5
  c('u5', 'malas-practicas', 'Malas prácticas generales', 'Clase Dios, métodos largos, código duplicado, baja cohesión.'),
  c('u5', 'acoplamiento', 'Acoplamiento', 'Depender de abstracciones (List) y no de implementaciones (ArrayList).'),
  c('u5', 'instanceof', 'instanceof y casts', 'Preguntar el tipo concreto suele reemplazarse con polimorfismo.'),
  c('u5', 'exposicion', 'Exposición del estado interno', 'Campos públicos y colecciones internas devueltas sin copia.'),
  c('u5', 'sobrediseno', 'Sobrediseño', 'Aplicar patrones donde no aportan flexibilidad real.'),
]

export const conceptById = (id: string) => CONCEPTS.find((x) => x.id === id)
export const conceptName = (id: string) => conceptById(id)?.name ?? id
