import type { ConceptId, DiagnosticCategory, Severity } from '../../models/types'

/** Metadatos pedagógicos de cada regla. La detección vive en analyzer.ts. */
export interface RuleMeta {
  id: string
  title: string
  severity: Severity
  category: DiagnosticCategory
  concept: ConceptId
  explanation: string
  why: string
  suggestion: string
  fixedExample?: string
}

const r = (m: RuleMeta) => m

export const RULES: Record<string, RuleMeta> = {
  'string-eq': r({
    id: 'string-eq', title: 'Comparación de Strings con ==', severity: 'error', category: 'functional', concept: 'identidad-igualdad',
    explanation: 'Se están comparando Strings (u otros objetos) con == o !=.',
    why: '== compara identidad (si son el mismo objeto en memoria), no el contenido. Dos Strings con el mismo texto pueden ser objetos distintos, y la comparación da false de forma impredecible.',
    suggestion: 'Usá equals (o equalsIgnoreCase). Si el valor puede ser null, usá Objects.equals(a, b).',
    fixedExample: 'if (this.nombre.equals(otro.getNombre())) { ... }\n// o, tolerante a null:\nif (Objects.equals(nombre, otroNombre)) { ... }',
  }),
  'double-eq': r({
    id: 'double-eq', title: 'Comparación exacta de doubles', severity: 'warning', category: 'functional', concept: 'identidad-igualdad',
    explanation: 'Se comparan valores double con == o !=.',
    why: 'Los double tienen error de redondeo: 0.1 + 0.2 == 0.3 es false. La comparación exacta falla con resultados de cálculos.',
    suggestion: 'Compará con una tolerancia, o usá Double.compare cuando necesitás un orden.',
    fixedExample: 'private static final double EPS = 1e-9;\nif (Math.abs(a - b) < EPS) { ... }\n// para ordenar:\nreturn Double.compare(p1.getPeso(), p2.getPeso());',
  }),
  'comparator-subtraction': r({
    id: 'comparator-subtraction', title: 'Resta usada en compare/compareTo', severity: 'warning', category: 'bad-practice', concept: 'comparator',
    explanation: 'El método de comparación devuelve una resta entre valores.',
    why: 'Con int la resta puede desbordar (Integer.MIN_VALUE - 1 es positivo) e invertir el orden. Con double, el cast a int trunca: 0.4 - 0.1 da 0 y dos elementos distintos quedan "iguales".',
    suggestion: 'Usá Integer.compare, Double.compare o Comparator.comparing.',
    fixedExample: 'return Integer.compare(p1.getExperiencia(), p2.getExperiencia());\n// o\nComparator.comparingInt(Pitufo::getExperiencia)',
  }),
  'comparator-contract': r({
    id: 'comparator-contract', title: 'compare nunca devuelve 0', severity: 'error', category: 'functional', concept: 'comparator',
    explanation: 'El método compare/compareTo sólo devuelve valores distintos de 0.',
    why: 'El contrato exige compare(a, a) == 0 y que el signo se invierta al invertir los argumentos. Si nunca devuelve 0, elementos iguales quedan desordenados y Collections.sort puede lanzar "Comparison method violates its general contract".',
    suggestion: 'Delegá en Integer.compare / String.compareTo, que devuelven 0 en caso de igualdad.',
    fixedExample: 'int res = Integer.compare(p2.getExperiencia(), p1.getExperiencia());\nif (res == 0) res = p1.getNombre().compareTo(p2.getNombre());\nreturn res;',
  }),
  'public-field': r({
    id: 'public-field', title: 'Campo público', severity: 'warning', category: 'bad-practice', concept: 'encapsulamiento',
    explanation: 'Una variable de instancia es public.',
    why: 'Cualquier cliente puede modificar el estado sin pasar por el objeto, rompiendo invariantes y acoplándose a la representación interna.',
    suggestion: 'Declaralo private y exponé comportamiento (o un getter si realmente hace falta).',
    fixedExample: 'private int experiencia;\npublic int getExperiencia() { return experiencia; }',
  }),
  'exposed-collection': r({
    id: 'exposed-collection', title: 'Colección interna expuesta', severity: 'warning', category: 'bad-practice', concept: 'exposicion',
    explanation: 'Un método devuelve directamente la colección interna del objeto.',
    why: 'El cliente obtiene un alias a la lista interna y puede agregar o borrar elementos sin que el objeto se entere (aliasing).',
    suggestion: 'Devolvé una copia o una vista no modificable.',
    fixedExample: 'public List<Elemento> getElementos() {\n    return new ArrayList<>(elementos);\n    // o: return Collections.unmodifiableList(elementos);\n}',
  }),
  'concrete-collection-type': r({
    id: 'concrete-collection-type', title: 'API acoplada a ArrayList', severity: 'info', category: 'design', concept: 'acoplamiento',
    explanation: 'Un campo, parámetro o tipo de retorno usa una implementación concreta (ArrayList, HashMap, ...).',
    why: 'Acopla a los clientes a una implementación concreta. Programar contra la interfaz (List, Map) permite cambiarla sin tocar al resto.',
    suggestion: 'Declará el tipo como List / Set / Map y usá la implementación sólo en el new.',
    fixedExample: 'private List<Pitufo> pitufos = new ArrayList<>();\npublic List<Pitufo> buscar(Condicion c) { ... }',
  }),
  'instanceof-chain': r({
    id: 'instanceof-chain', title: 'Uso excesivo de instanceof', severity: 'warning', category: 'design', concept: 'instanceof',
    explanation: 'El método pregunta por el tipo concreto de los objetos.',
    why: 'Cada nuevo tipo obliga a modificar este método (viola abierto/cerrado). Es el síntoma clásico de que falta polimorfismo.',
    suggestion: 'Definí un método en la superclase o interfaz y que cada subclase lo redefina.',
    fixedExample: '// en lugar de: if (e instanceof Personaje) ... else if (e instanceof Tripulacion) ...\npublic abstract double getFuerza(); // y cada clase lo implementa',
  }),
  'downcast': r({
    id: 'downcast', title: 'Cast a un tipo concreto', severity: 'info', category: 'design', concept: 'instanceof',
    explanation: 'Se castea un objeto a una clase del dominio.',
    why: 'El cast pierde la ventaja del polimorfismo y puede fallar en ejecución (ClassCastException). Fuera de equals suele indicar responsabilidades mal asignadas.',
    suggestion: 'Mové el comportamiento al tipo declarado o subí el método a la superclase.',
  }),
  'generic-catch': r({
    id: 'generic-catch', title: 'catch demasiado genérico', severity: 'warning', category: 'bad-practice', concept: 'excepciones',
    explanation: 'Se captura Exception, RuntimeException o Throwable.',
    why: 'Atrapa también errores de programación (NullPointerException, IndexOutOfBounds) que deberían propagarse, ocultando bugs.',
    suggestion: 'Capturá sólo las excepciones que sabés manejar en ese punto.',
    fixedExample: 'try {\n    cuenta.extraer(monto);\n} catch (SaldoInsuficienteException e) {\n    mostrarError(e.getMessage());\n}',
  }),
  'empty-catch': r({
    id: 'empty-catch', title: 'Excepción ocultada (catch vacío)', severity: 'warning', category: 'bad-practice', concept: 'excepciones',
    explanation: 'Un bloque catch no hace nada (o sólo imprime el stack trace).',
    why: 'El error desaparece silenciosamente y el programa sigue en un estado inválido.',
    suggestion: 'Manejá la situación, relanzá una excepción de dominio o dejá que se propague con throws.',
    fixedExample: 'catch (IOException e) {\n    throw new ArchivoInvalidoException("No se pudo leer", e);\n}',
  }),
  'throws-exception': r({
    id: 'throws-exception', title: 'throws Exception genérico', severity: 'info', category: 'design', concept: 'diseno-excepciones',
    explanation: 'Un método declara throws Exception.',
    why: 'El cliente no sabe qué puede fallar y se ve obligado a capturar todo.',
    suggestion: 'Declará excepciones específicas del dominio.',
  }),
  'equals-without-hashcode': r({
    id: 'equals-without-hashcode', title: 'equals sin hashCode', severity: 'warning', category: 'functional', concept: 'identidad-igualdad',
    explanation: 'La clase redefine equals pero no hashCode.',
    why: 'Objetos iguales deben tener el mismo hashCode. Si no, HashSet y HashMap no los encuentran y aparecen "repetidos".',
    suggestion: 'Redefiní hashCode usando los mismos atributos que equals.',
    fixedExample: '@Override\npublic int hashCode() {\n    return Objects.hash(nombre, edad);\n}',
  }),
  'equals-overload': r({
    id: 'equals-overload', title: 'equals sobrecargado en lugar de redefinido', severity: 'error', category: 'functional', concept: 'redefinicion',
    explanation: 'equals recibe un parámetro que no es Object.',
    why: 'Eso es una sobrecarga, no una redefinición: las colecciones llaman a equals(Object) y nunca usan tu versión.',
    suggestion: 'La firma debe ser public boolean equals(Object o), con @Override.',
    fixedExample: '@Override\npublic boolean equals(Object o) {\n    if (this == o) return true;\n    if (!(o instanceof Pitufo)) return false;\n    Pitufo otro = (Pitufo) o;\n    return nombre.equals(otro.nombre);\n}',
  }),
  'long-method': r({
    id: 'long-method', title: 'Método demasiado largo', severity: 'info', category: 'style', concept: 'malas-practicas',
    explanation: 'El método tiene muchas líneas.',
    why: 'Suele hacer varias cosas a la vez: cuesta leerlo, testearlo y reutilizarlo.',
    suggestion: 'Extraé pasos en métodos con nombres claros o delegá en otros objetos.',
  }),
  'god-class': r({
    id: 'god-class', title: 'Clase demasiado grande (posible Clase Dios)', severity: 'warning', category: 'design', concept: 'malas-practicas',
    explanation: 'La clase concentra muchos métodos o líneas.',
    why: 'Una clase que sabe y hace todo tiene baja cohesión y alto acoplamiento.',
    suggestion: 'Repartí responsabilidades entre objetos colaboradores.',
  }),
  'duplicated-code': r({
    id: 'duplicated-code', title: 'Código duplicado', severity: 'info', category: 'design', concept: 'malas-practicas',
    explanation: 'Hay un bloque de líneas repetido en otro lugar.',
    why: 'Un cambio futuro hay que hacerlo en dos lugares; es fácil olvidar uno.',
    suggestion: 'Extraé el bloque a un método o subilo a la superclase (Template Method).',
  }),
  'missing-final': r({
    id: 'missing-final', title: 'Campo que podría ser final', severity: 'info', category: 'style', concept: 'encapsulamiento',
    explanation: 'El campo sólo se asigna en el constructor.',
    why: 'Marcarlo final documenta que la referencia no cambia y evita reasignaciones accidentales. Es una mejora opcional.',
    suggestion: 'Agregá final a la declaración.',
  }),
  'unused-variable': r({
    id: 'unused-variable', title: 'Variable sin utilizar', severity: 'warning', category: 'style', concept: 'malas-practicas',
    explanation: 'Se declara una variable local que nunca se usa.',
    why: 'Agrega ruido y suele indicar que falta usar un resultado (bug) o que quedó código viejo.',
    suggestion: 'Eliminala o usala donde corresponde.',
  }),
  'dead-code': r({
    id: 'dead-code', title: 'Código muerto después de return/throw', severity: 'error', category: 'compilation', concept: 'malas-practicas',
    explanation: 'Hay sentencias después de un return o throw en el mismo bloque.',
    why: 'Nunca se ejecutan; javac lo rechaza como "unreachable statement".',
    suggestion: 'Eliminá las sentencias o reordená la lógica.',
  }),
  'shallow-copy': r({
    id: 'shallow-copy', title: 'Copia superficial', severity: 'warning', category: 'functional', concept: 'copia-profunda',
    explanation: 'El método de copia reutiliza la colección o los elementos del original.',
    why: 'Original y copia comparten objetos: modificar uno modifica el otro (aliasing). En un Composite, la copia debe copiar cada hijo recursivamente.',
    suggestion: 'Creá una lista nueva y agregá copia() de cada hijo.',
    fixedExample: 'public Elemento copia() {\n    Contenedor nuevo = new Contenedor(nombre);\n    for (Elemento e : elementos)\n        nuevo.agregar(e.copia());\n    return nuevo;\n}',
  }),
  'empty-composite-copy': r({
    id: 'empty-composite-copy', title: 'Posible compuesto vacío incluido en la copia', severity: 'info', category: 'functional', concept: 'copia-profunda',
    explanation: 'La copia filtrada agrega los hijos copiados sin verificar si quedaron vacíos o son null.',
    why: 'Si un subcompuesto no tiene elementos que cumplan la condición, la copia termina con contenedores vacíos, cosa que los enunciados suelen prohibir.',
    suggestion: 'Devolvé null (o un Optional) cuando el compuesto queda vacío y no lo agregues.',
    fixedExample: 'Elemento hijo = e.copia(cond);\nif (hijo != null) nuevo.agregar(hijo);\n...\nreturn nuevo.getCantidad() == 0 ? null : nuevo;',
  }),
  'inheritance-reuse': r({
    id: 'inheritance-reuse', title: 'Herencia usada sólo para reutilizar código', severity: 'warning', category: 'design', concept: 'composicion-vs-herencia',
    explanation: 'La clase extiende una colección de la librería (ArrayList, HashMap, ...).',
    why: 'Hereda decenas de métodos públicos (add, clear, remove) que rompen sus invariantes. No hay una relación "es-un" real.',
    suggestion: 'Usá composición: un campo private List<...> y delegá sólo lo necesario.',
    fixedExample: 'public class Brigada {\n    private final List<Pitufo> pitufos = new ArrayList<>();\n    public void agregar(Pitufo p) { pitufos.add(p); }\n}',
  }),
  'lsp-violation': r({
    id: 'lsp-violation', title: 'Violación del principio de sustitución', severity: 'warning', category: 'design', concept: 'sustitucion',
    explanation: 'Una subclase redefine un método para lanzar UnsupportedOperationException.',
    why: 'Un cliente que usa la superclase deja de funcionar al recibir esta subclase: no es sustituible.',
    suggestion: 'Revisá la jerarquía: quizá la operación no pertenece a la superclase, o hace falta una interfaz más chica.',
  }),
  'type-switch': r({
    id: 'type-switch', title: 'Muchos if por tipo', severity: 'warning', category: 'design', concept: 'polimorfismo',
    explanation: 'Se decide el comportamiento preguntando un "tipo" guardado como dato.',
    why: 'Cada tipo nuevo agrega otro if. El polimorfismo (o una Strategy) elimina esa lógica condicional.',
    suggestion: 'Reemplazá el campo tipo por subclases o por un objeto Strategy.',
  }),
  'too-many-setters': r({
    id: 'too-many-setters', title: 'Uso excesivo de setters', severity: 'info', category: 'design', concept: 'encapsulamiento',
    explanation: 'La clase expone muchos setters.',
    why: 'El objeto se vuelve una bolsa de datos que otros manipulan: la lógica termina fuera de la clase.',
    suggestion: 'Pasá los valores obligatorios por constructor y exponé operaciones con significado de dominio.',
  }),
  'unclear-name': r({
    id: 'unclear-name', title: 'Nombre de método poco claro', severity: 'info', category: 'style', concept: 'responsabilidades',
    explanation: 'El nombre del método no comunica su intención.',
    why: 'Los nombres son la documentación principal del diseño.',
    suggestion: 'Usá un verbo o pregunta del dominio: getPesoTotal, cumple, agregar, buscar.',
  }),
  // ---- Compilación (chequeo básico en navegador) ----
  'syntax-braces': r({
    id: 'syntax-braces', title: 'Llaves o paréntesis desbalanceados', severity: 'error', category: 'compilation', concept: 'objetos-clases',
    explanation: 'La cantidad de llaves o paréntesis que abren no coincide con las que cierran.',
    why: 'El código no compila.',
    suggestion: 'Revisá que cada { tenga su } y cada ( su ). El editor resalta el par al posicionar el cursor.',
  }),
  'syntax-class-name': r({
    id: 'syntax-class-name', title: 'Nombre de clase y archivo distintos', severity: 'error', category: 'compilation', concept: 'objetos-clases',
    explanation: 'Una clase public debe declararse en un archivo con su mismo nombre.',
    why: 'javac rechaza el archivo.',
    suggestion: 'Renombrá la clase o el archivo para que coincidan.',
  }),
  javac: r({
    id: 'javac', title: 'Error de compilación', severity: 'error', category: 'compilation', concept: 'objetos-clases',
    explanation: '', why: 'El código no compila, por lo que no se puede ejecutar.', suggestion: '',
  }),
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  error: 'Error real',
  warning: 'Mala práctica',
  info: 'Mejora opcional',
}

export const CATEGORY_LABEL: Record<DiagnosticCategory, string> = {
  compilation: 'Compilación',
  functional: 'Error funcional',
  'bad-practice': 'Mala práctica',
  style: 'Estilo',
  design: 'Diseño',
}
