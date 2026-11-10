import type { Quiz } from '../models/types'

export const QUIZZES: Quiz[] = [
  {
    id: 'quiz-u1', unit: 'u1', title: 'Fundamentos: objetos, identidad e igualdad',
    questions: [
      {
        id: 'u1-1', kind: 'multiple-choice', topic: 'Predecir la salida', concepts: ['identidad-igualdad'],
        prompt: '¿Qué imprime este código?',
        code: `String a = new String("Luffy");
String b = new String("Luffy");
System.out.println(a == b);
System.out.println(a.equals(b));`,
        options: ['true / true', 'false / true', 'true / false', 'false / false'], correct: 1,
        explanation: 'new crea dos objetos distintos: == compara identidad (false). equals compara contenido (true).',
      },
      {
        id: 'u1-2', kind: 'multiple-choice', topic: 'Detectar aliasing', concepts: ['referencias'],
        prompt: '¿Cuántos elementos tiene equipo al final?',
        code: `List<String> l = new ArrayList<>();
Equipo equipo = new Equipo(l); // el constructor hace this.jugadores = l;
l.add("Zoro");
l.add("Nami");
equipo.getJugadores().add("Sanji"); // getJugadores devuelve jugadores`,
        options: ['0', '1', '2', '3'], correct: 3,
        explanation: 'Sin copias defensivas, l, el atributo jugadores y lo que devuelve getJugadores son la misma lista (aliasing): los tres add impactan.',
      },
      {
        id: 'u1-3', kind: 'true-false', topic: 'Contrato de equals', concepts: ['identidad-igualdad'],
        prompt: 'Si dos objetos son iguales según equals, deben devolver el mismo hashCode.', correct: true,
        explanation: 'Es el contrato de Object. Si no se cumple, HashSet y HashMap fallan.',
      },
      {
        id: 'u1-4', kind: 'true-false', topic: 'Redefinición', concepts: ['identidad-igualdad', 'redefinicion'],
        prompt: 'public boolean equals(Personaje otro) redefine el equals de Object.', correct: false,
        explanation: 'Cambia el tipo de parámetro: es una sobrecarga. La redefinición debe recibir Object.',
      },
      {
        id: 'u1-5', kind: 'match', topic: 'Relacionar conceptos', concepts: ['objetos-clases', 'estado-comportamiento', 'mensajes'],
        prompt: 'Relacioná cada concepto con su definición.',
        pairs: [
          ['Clase', 'Molde que define estado y comportamiento'],
          ['Instancia', 'Objeto concreto creado con new'],
          ['Variable de instancia', 'Parte del estado de cada objeto'],
          ['Mensaje', 'Pedido que un objeto envía a otro'],
        ],
        explanation: 'El mensaje es lo que se pide; el método es la implementación que el receptor ejecuta.',
      },
      {
        id: 'u1-6', kind: 'multiple-choice', topic: 'Responsabilidades', concepts: ['responsabilidades'],
        prompt: 'Un Contenedor tiene compras y otros contenedores. ¿Quién debería calcular el peso total?',
        options: ['El cliente, recorriendo los elementos con getElementos()', 'Cada Compra, recorriendo el contenedor que la contiene', 'El propio Contenedor, pidiendo getPeso() a cada elemento', 'Una clase CalculadoraDePesos con instanceof'], correct: 2,
        explanation: 'El contenedor tiene la información (sus elementos): es el experto. Así no expone su colección y el cálculo funciona recursivamente.',
      },
      {
        id: 'u1-7', kind: 'complete-code', topic: 'Completar código', concepts: ['identidad-igualdad'],
        prompt: 'Completá para que la comparación sea correcta y tolerante a null.',
        code: `if (Objects.___(nombre, otro.getNombre())) { ... }`,
        blanks: [['equals']],
        explanation: 'Objects.equals(a, b) devuelve true si ambos son null o si a.equals(b).',
      },
    ],
  },
  {
    id: 'quiz-u2', unit: 'u2', title: 'Herencia, abstractas, interfaces y relaciones',
    questions: [
      {
        id: 'u2-1', kind: 'multiple-choice', topic: 'Determinar el método ejecutado', concepts: ['redefinicion', 'this-super'],
        prompt: '¿Qué imprime new B().saludar()?',
        code: `class A {
    String nombre() { return "A"; }
    String saludar() { return "Hola " + nombre(); }
}
class B extends A {
    @Override String nombre() { return "B"; }
    @Override String saludar() { return super.saludar() + "!"; }
}`,
        options: ['Hola A', 'Hola A!', 'Hola B!', 'Hola B'], correct: 2,
        explanation: 'super.saludar() ejecuta el código de A, pero dentro de él nombre() se envía a this, que es un B: binding dinámico → "B".',
      },
      {
        id: 'u2-2', kind: 'match', topic: 'Visibilidad', concepts: ['visibilidad'],
        prompt: 'Relacioná cada modificador con quién puede acceder.',
        pairs: [
          ['private', 'Sólo la propia clase'],
          ['(sin modificador)', 'Clases del mismo paquete'],
          ['protected', 'Paquete y subclases'],
          ['public', 'Cualquier clase'],
        ],
        explanation: 'De más restrictivo a menos: private < package-private < protected < public.',
      },
      {
        id: 'u2-3', kind: 'order-steps', topic: 'Ordenar pasos', concepts: ['constructores', 'herencia'],
        prompt: 'Ordená qué sucede al ejecutar new Capitan("Díaz", 1000, 2), donde Capitan extiende Jugador que extiende Empleado.',
        steps: ['Se reserva memoria para el objeto Capitan', 'Capitan(...) llama a super(nombre, basico, goles)', 'Jugador(...) llama a super(nombre, basico)', 'Se ejecuta el cuerpo del constructor de Empleado', 'Se ejecuta el resto del constructor de Jugador', 'Se ejecuta el resto del constructor de Capitan'],
        explanation: 'Los constructores se encadenan hacia arriba y sus cuerpos se completan desde la superclase hacia abajo.',
      },
      {
        id: 'u2-4', kind: 'true-false', topic: 'Abstractas', concepts: ['abstractas'],
        prompt: 'Una clase abstracta puede tener constructor.', correct: true,
        explanation: 'No se instancia directamente, pero su constructor inicializa el estado común y lo invocan las subclases con super(...).',
      },
      {
        id: 'u2-5', kind: 'multiple-choice', topic: 'Relaciones', concepts: ['relaciones'],
        prompt: 'Una Factura tiene Líneas que no tienen sentido sin la factura y se eliminan con ella. ¿Qué relación es?',
        options: ['Asociación', 'Agregación', 'Composición', 'Herencia'], correct: 2,
        explanation: 'Composición: relación todo-parte con ciclo de vida compartido.',
      },
      {
        id: 'u2-6', kind: 'multiple-choice', topic: 'Detectar malas prácticas', concepts: ['composicion-vs-herencia'],
        prompt: '¿Qué problema tiene este diseño?',
        code: `public class Tripulacion extends ArrayList<Personaje> {
    public int getFuerza() { ... }
}`,
        options: ['Ninguno, reutiliza código', 'Herencia sólo para reutilizar: expone clear(), remove(), etc.', 'Debería extender LinkedList', 'Falta un constructor'], correct: 1,
        explanation: 'Una tripulación no ES UNA lista. Conviene composición: un atributo List<Personaje> privado.',
      },
      {
        id: 'u2-7', kind: 'complete-code', topic: 'Completar código', concepts: ['template-method'],
        prompt: 'Completá el método plantilla para que ninguna subclase pueda redefinirlo, y el hook con su valor por defecto.',
        code: `public ___ double costo() {
    return costoBase() + recargo();
}
protected double recargo() {
    return ___;
}`,
        blanks: [['final'], ['0', '0.0', '0d']],
        explanation: 'final fija el algoritmo; el hook devuelve un valor neutro que las subclases pueden redefinir.',
      },
    ],
  },
  {
    id: 'quiz-u3', unit: 'u3', title: 'Polimorfismo, binding y excepciones',
    questions: [
      {
        id: 'u3-1', kind: 'multiple-choice', topic: 'Detectar binding dinámico', concepts: ['binding'],
        prompt: 'Dado Empleado e = new Capitan(...); donde getGoles() está definido sólo en Jugador, ¿qué pasa con e.getGoles()?',
        options: ['Ejecuta Jugador.getGoles()', 'Error de compilación', 'ClassCastException en ejecución', 'Devuelve 0'], correct: 1,
        explanation: 'El compilador busca getGoles en el tipo estático (Empleado) y no lo encuentra. El tipo dinámico sólo importa en ejecución.',
      },
      {
        id: 'u3-2', kind: 'multiple-choice', topic: 'Determinar el método ejecutado', concepts: ['binding', 'redefinicion'],
        prompt: '¿Qué imprime?',
        code: `class Animal { void hablar(Animal a) { System.out.print("A-A "); } }
class Perro extends Animal {
    void hablar(Animal a) { System.out.print("P-A "); }
    void hablar(Perro p)  { System.out.print("P-P "); }
}
Animal x = new Perro();
Perro y = new Perro();
x.hablar(y);
y.hablar(y);`,
        options: ['P-P P-P', 'P-A P-P', 'A-A P-P', 'P-A P-A'], correct: 1,
        explanation: 'La sobrecarga se elige en compilación con tipos estáticos: x es Animal, que sólo tiene hablar(Animal). En ejecución se usa la redefinición de Perro → "P-A". Para y (Perro) se elige hablar(Perro) → "P-P".',
      },
      {
        id: 'u3-3', kind: 'order-steps', topic: 'Propagación de excepciones', concepts: ['excepciones'],
        prompt: 'main llama a transferir, que llama a extraer, que lanza SaldoInsuficienteException. main tiene el try/catch. Ordená.',
        steps: ['extraer ejecuta throw new SaldoInsuficienteException(...)', 'extraer termina abruptamente', 'transferir no la captura y termina sin depositar', 'El catch de main la recibe', 'Se ejecuta el finally de main, si existe'],
        explanation: 'La excepción desapila métodos hasta encontrar un catch compatible; finally se ejecuta al final del try/catch.',
      },
      {
        id: 'u3-4', kind: 'true-false', topic: 'Checked vs unchecked', concepts: ['excepciones'],
        prompt: 'IllegalArgumentException es checked: el compilador obliga a declararla con throws.', correct: false,
        explanation: 'Extiende RuntimeException: es unchecked.',
      },
      {
        id: 'u3-5', kind: 'multiple-choice', topic: 'Detectar malas prácticas', concepts: ['excepciones'],
        prompt: '¿Cuál es el principal problema?',
        code: `try {
    cuenta.extraer(monto);
} catch (Exception e) {
}`,
        options: ['Falta finally', 'Captura todo y oculta el error', 'extraer debería ser static', 'Debería ser catch (Throwable e)'], correct: 1,
        explanation: 'catch genérico y vacío: atrapa también bugs (NullPointerException) y el programa sigue como si nada.',
      },
      {
        id: 'u3-6', kind: 'multiple-choice', topic: 'Predecir la salida', concepts: ['excepciones'],
        prompt: '¿Qué imprime?',
        code: `try {
    System.out.print("1 ");
    throw new IllegalStateException();
} catch (IllegalStateException e) {
    System.out.print("2 ");
} finally {
    System.out.print("3 ");
}
System.out.print("4");`,
        options: ['1 2 3 4', '1 3 4', '1 2 4', '1 2 3'], correct: 0,
        explanation: 'Se lanza, se captura (2), finally siempre se ejecuta (3) y la ejecución continúa (4).',
      },
      {
        id: 'u3-7', kind: 'true-false', topic: 'Sustitución', concepts: ['sustitucion'],
        prompt: 'Una subclase que redefine un método heredado para lanzar UnsupportedOperationException respeta el principio de sustitución.', correct: false,
        explanation: 'El cliente que usa la superclase espera que la operación funcione: la subclase no es sustituible.',
      },
    ],
  },
  {
    id: 'quiz-u4', unit: 'u4', title: 'Patrones de diseño',
    questions: [
      {
        id: 'u4-1', kind: 'multiple-choice', topic: 'Elegir un patrón', concepts: ['composite'],
        prompt: 'Noticias agrupadas en secciones, que pueden contener subsecciones, y se necesita la cantidad total de palabras. ¿Qué patrón?',
        options: ['Strategy', 'Composite', 'Observer', 'Decorator'], correct: 1,
        explanation: 'Estructura todo-parte recursiva tratada uniformemente: Composite.',
      },
      {
        id: 'u4-2', kind: 'multiple-choice', topic: 'Elegir un patrón', concepts: ['strategy'],
        prompt: 'El precio de un coleccionable puede calcularse "precio base", "con descuento" o "por peso", y debe poder cambiarse en ejecución.',
        options: ['Template Method', 'State', 'Strategy', 'Iterator'], correct: 2,
        explanation: 'Algoritmos intercambiables encapsulados en objetos: Strategy. (Template Method fija la variante por subclase, no en ejecución.)',
      },
      {
        id: 'u4-3', kind: 'multiple-choice', topic: 'Analizar un Comparator', concepts: ['comparator'],
        prompt: '¿En qué orden quedan los pitufos?',
        code: `// experiencia: Gruñón=50, Bromista=80, Tímido=50
lista.sort((a, b) -> {
    int r = Integer.compare(b.getExperiencia(), a.getExperiencia());
    return r != 0 ? r : a.getNombre().compareTo(b.getNombre());
});`,
        options: ['Gruñón, Tímido, Bromista', 'Bromista, Gruñón, Tímido', 'Bromista, Tímido, Gruñón', 'Tímido, Gruñón, Bromista'], correct: 1,
        explanation: 'Mayor experiencia primero (Bromista 80); empate 50 entre Gruñón y Tímido se resuelve alfabéticamente.',
      },
      {
        id: 'u4-4', kind: 'multiple-choice', topic: 'Analizar un Comparator', concepts: ['comparator'],
        prompt: '¿Qué problema tiene este Comparator de Productos por peso (double)?',
        code: `public int compare(Producto a, Producto b) {
    return (int) (a.getPeso() - b.getPeso());
}`,
        options: ['Ninguno', 'Ordena descendente', 'Pesos que difieren en menos de 1 se consideran iguales', 'No compila'], correct: 2,
        explanation: '10.2 - 10.6 = -0.4 → (int) 0. Usá Double.compare.',
      },
      {
        id: 'u4-5', kind: 'true-false', topic: 'Copia profunda', concepts: ['copia-profunda'],
        prompt: 'copia.elementos = new ArrayList<>(this.elementos) es una copia profunda de un Composite.', correct: false,
        explanation: 'Crea una lista nueva pero con los MISMOS hijos: copia superficial. Hay que copiar cada hijo.',
      },
      {
        id: 'u4-6', kind: 'match', topic: 'Relacionar patrones', concepts: ['decorator', 'state', 'observer', 'iterator'],
        prompt: 'Relacioná cada patrón con su intención.',
        pairs: [
          ['Decorator', 'Agregar responsabilidades envolviendo'],
          ['State', 'Cambiar comportamiento según el estado actual'],
          ['Observer', 'Notificar cambios a interesados'],
          ['Iterator', 'Recorrer sin exponer la estructura'],
        ],
        explanation: 'Los cuatro reemplazan condicionales o acoplamiento por objetos colaboradores.',
      },
      {
        id: 'u4-7', kind: 'complete-code', topic: 'Completar código', concepts: ['condiciones'],
        prompt: 'Completá CondicionOr.',
        code: `public boolean cumple(Personaje p) {
    return c1.___(p) ___ c2.cumple(p);
}`,
        blanks: [['cumple'], ['||']],
        explanation: 'Delega en las condiciones combinadas: c1.cumple(p) || c2.cumple(p).',
      },
      {
        id: 'u4-8', kind: 'order-steps', topic: 'Recorrido de Composite', concepts: ['composite'],
        prompt: 'Raíz contiene [Hoja A, Sub(Hoja B, Hoja C)]. Ordená los envíos de getPeso() en un recorrido en profundidad.',
        steps: ['Raíz.getPeso()', 'A.getPeso()', 'Sub.getPeso()', 'B.getPeso()', 'C.getPeso()'],
        explanation: 'El compuesto pide a cada hijo en orden; un subcompuesto resuelve sus hijos antes de devolver.',
      },
    ],
  },
  {
    id: 'quiz-u5', unit: 'u5', title: 'Buenas y malas prácticas',
    questions: [
      {
        id: 'u5-1', kind: 'multiple-choice', topic: 'Detectar malas prácticas', concepts: ['instanceof'],
        prompt: '¿Qué mejora corresponde?',
        code: `double total = 0;
for (Elemento e : elementos) {
    if (e instanceof Compra) total += ((Compra) e).getPeso();
    else if (e instanceof Contenedor) total += ((Contenedor) e).getPesoTotal();
}`,
        options: ['Usar un switch', 'Declarar getPeso() abstracto en Elemento y redefinirlo', 'Agregar un campo tipo', 'Usar getClass() en vez de instanceof'], correct: 1,
        explanation: 'Polimorfismo: cada clase sabe su peso; el compuesto no pregunta tipos.',
      },
      {
        id: 'u5-2', kind: 'multiple-choice', topic: 'Detectar malas prácticas', concepts: ['acoplamiento'],
        prompt: '¿Cuál es la mejor firma?',
        options: ['public ArrayList<Pitufo> buscar(Condicion c)', 'public List<Pitufo> buscar(Condicion c)', 'public Object buscar(Condicion c)', 'public Pitufo[] buscar(CondicionMayor c)'], correct: 1,
        explanation: 'Programar contra interfaces (List, Condicion) reduce el acoplamiento.',
      },
      {
        id: 'u5-3', kind: 'true-false', topic: 'Sobrediseño', concepts: ['sobrediseno'],
        prompt: 'Siempre conviene aplicar Strategy aunque haya un solo algoritmo, "por si acaso".', correct: false,
        explanation: 'Sin variación real, el patrón agrega clases e indirección sin beneficio.',
      },
      {
        id: 'u5-4', kind: 'match', topic: 'Clasificar problemas', concepts: ['malas-practicas'],
        prompt: 'Clasificá cada problema.',
        pairs: [
          ['nombre == otro.nombre (Strings)', 'Error funcional'],
          ['public List<X> elementos;', 'Mala práctica'],
          ['Campo privado que podría ser final', 'Mejora opcional'],
          ['Sentencia después de return', 'Error de compilación'],
        ],
        explanation: 'La plataforma distingue error real, mala práctica y mejora opcional; no todo "estilo" es un error.',
      },
      {
        id: 'u5-5', kind: 'multiple-choice', topic: 'Detectar malas prácticas', concepts: ['exposicion'],
        prompt: '¿Qué permite este getter?',
        code: `public List<Noticia> getNoticias() { return noticias; }`,
        options: ['Nada, es correcto', 'Que el cliente modifique las noticias de la sección', 'Un error de compilación', 'Una copia profunda'], correct: 1,
        explanation: 'Devuelve un alias a la lista interna.',
      },
    ],
  },
]

export const quizById = (id: string) => QUIZZES.find((q) => q.id === id)
