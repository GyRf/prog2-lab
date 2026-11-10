import type { Lesson } from '../models/types'

// Contenido teórico resumido. Basado en el programa de la materia y en la
// documentación oficial de Java. Lo específico de la cátedra que no figure acá
// debe confirmarlo el estudiante con el material oficial.

export const LESSONS: Lesson[] = [
  // ======================= UNIDAD 1 =======================
  {
    id: 'objetos-y-clases', unit: 'u1', title: 'Objetos, clases y mensajes', concepts: ['objetos-clases', 'estado-comportamiento', 'mensajes', 'responsabilidades'],
    quizId: 'quiz-u1', animationIds: ['referencias'],
    blocks: [
      { type: 'p', text: 'Un programa orientado a objetos es un conjunto de objetos que colaboran enviándose mensajes. Cada objeto tiene estado (lo que sabe), comportamiento (lo que sabe hacer) e identidad (es ese objeto y no otro).' },
      { type: 'p', text: 'Una clase es el molde: define las variables de instancia y los métodos que tendrán sus instancias. Con new se crea una instancia; el constructor la deja en un estado válido.' },
      { type: 'code', caption: 'Clase con estado encapsulado y comportamiento', code: `public class Pitufo {
    private final String nombre;   // estado
    private int experiencia;

    public Pitufo(String nombre) { // constructor
        this.nombre = nombre;
        this.experiencia = 0;
    }

    public void entrenar(int horas) { // comportamiento
        experiencia += horas * 2;
    }

    public int getExperiencia() {
        return experiencia;
    }
}

Pitufo p = new Pitufo("Fortachón"); // instancia
p.entrenar(3);                      // envío de mensaje` },
      { type: 'h', text: 'Mensaje vs. método' },
      { type: 'p', text: 'El emisor envía un mensaje (p.entrenar(3)); el receptor decide qué método ejecutar. Esa separación es la base del polimorfismo: distintos receptores pueden responder el mismo mensaje de distinta forma.' },
      { type: 'h', text: 'Responsabilidades y relación cliente-servidor' },
      { type: 'p', text: 'El objeto que envía el mensaje es el cliente; el que lo resuelve es el servidor. Una buena distribución de responsabilidades pone cada cálculo en el objeto que tiene la información para hacerlo ("experto en información").' },
      { type: 'tip', text: 'Pregunta de parcial típica: "¿quién es responsable de calcular el peso total?" — el objeto que conoce los elementos (el contenedor), no el cliente que pide el dato.' },
      { type: 'h', text: 'Creación y destrucción' },
      { type: 'p', text: 'En Java los objetos se crean con new y no se destruyen explícitamente: el recolector de basura libera los que ya no son alcanzables desde ninguna referencia.' },
    ],
    exerciseIds: ['interfaz-figuras'],
  },
  {
    id: 'identidad-igualdad', unit: 'u1', title: 'Identidad, igualdad y referencias', concepts: ['identidad-igualdad', 'referencias'],
    quizId: 'quiz-u1', animationIds: ['identidad-igualdad', 'referencias'],
    blocks: [
      { type: 'p', text: 'Las variables de tipo objeto guardan referencias, no objetos. Dos variables pueden referenciar al mismo objeto (aliasing): un cambio hecho por una se ve desde la otra.' },
      { type: 'list', items: ['== compara identidad: ¿son el mismo objeto?', 'equals compara igualdad según lo que defina la clase (por defecto, igual que ==).', 'Si redefinís equals, tenés que redefinir hashCode con los mismos atributos.'] },
      { type: 'code', caption: 'equals y hashCode', code: `@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;
    Personaje otro = (Personaje) o;
    return edad == otro.edad && nombre.equals(otro.nombre);
}

@Override
public int hashCode() {
    return Objects.hash(nombre, edad);
}` },
      { type: 'warn', text: 'Comparar Strings con == "a veces funciona" porque los literales se reutilizan, pero falla con Strings construidos en ejecución. Siempre equals.' },
      { type: 'warn', text: 'equals(Personaje otro) es una sobrecarga, no una redefinición: las colecciones nunca la llaman.' },
    ],
    exerciseIds: ['equals-hashcode', 'aliasing-equipo'],
  },
  {
    id: 'encapsulamiento', unit: 'u1', title: 'Encapsulamiento, modularidad y reutilización', concepts: ['encapsulamiento', 'exposicion'],
    quizId: 'quiz-u1',
    blocks: [
      { type: 'p', text: 'Encapsular es ocultar la representación interna y exponer comportamiento. Los atributos son private; el objeto decide qué se puede hacer con su estado.' },
      { type: 'code', caption: 'Copias defensivas para evitar aliasing', code: `public Equipo(List<String> jugadores) {
    this.jugadores = new ArrayList<>(jugadores); // copia al recibir
}

public List<String> getJugadores() {
    return Collections.unmodifiableList(jugadores); // vista de sólo lectura
}` },
      { type: 'tip', text: 'Un getter por cada atributo y un setter por cada atributo no es encapsulamiento: es exponer el estado con más pasos. Preferí métodos con significado de dominio (agregar, entrenar, cumple).' },
    ],
    exerciseIds: ['aliasing-equipo'],
  },
  {
    id: 'arraylist', unit: 'u1', title: 'List y ArrayList: listas de objetos', concepts: ['arraylist', 'referencias', 'encapsulamiento'],
    quizId: 'quiz-u1',
    blocks: [
      { type: 'p', text: 'List es una interfaz de java.util: define qué se puede hacer con una lista ordenada (agregar, obtener por posición, buscar, eliminar). ArrayList es una de sus implementaciones, la más usada.' },
      { type: 'p', text: 'ArrayList es una lista de tamaño variable: crece sola a medida que agregás elementos, mantiene el orden de inserción y permite acceder por posición (índice desde 0). Está en java.util, así que hay que importarla.' },
      { type: 'code', caption: 'Declarar y crear', code: `import java.util.ArrayList;
import java.util.List;

List<Pitufo> pitufos = new ArrayList<>();   // tipo de la variable: la interfaz List
List<Integer> numeros = new ArrayList<>();  // con primitivos se usa la clase envoltorio
// List<int> no compila: los genéricos sólo aceptan objetos` },
      { type: 'tip', text: 'Declarar la variable como List y crear un ArrayList permite cambiar la implementación sin tocar el resto del código. Es lo que se espera en los parciales.' },
      { type: 'h', text: 'Métodos que más se usan' },
      { type: 'list', items: [
        'add(e): agrega al final. add(i, e) inserta en la posición i y corre el resto.',
        'get(i): devuelve el elemento de la posición i. set(i, e) lo reemplaza.',
        'size(): cantidad de elementos (no length, que es de los arreglos). isEmpty(): si no tiene ninguno.',
        'contains(e) e indexOf(e): buscan usando equals, así que dependen de que la clase lo redefina.',
        'remove(i) elimina por posición; remove(objeto) elimina la primera aparición según equals.',
        'clear(): vacía la lista. addAll(otra): agrega todos los elementos de otra colección.',
      ] },
      { type: 'warn', text: 'Con List<Integer>, numeros.remove(1) borra la POSICIÓN 1, no el número 1. Para borrar el valor: numeros.remove(Integer.valueOf(1)).' },
      { type: 'h', text: 'Recorrer' },
      { type: 'code', caption: 'for-each, por índice y eliminar mientras se recorre', code: `for (Pitufo p : pitufos) {             // for-each: el más claro para leer todos
    System.out.println(p.getNombre());
}

for (int i = 0; i < pitufos.size(); i++) { // por índice: cuando necesitás la posición
    System.out.println(i + ": " + pitufos.get(i).getNombre());
}

// Para eliminar mientras recorrés, usá el Iterator (o removeIf):
Iterator<Pitufo> it = pitufos.iterator();
while (it.hasNext()) {
    if (it.next().getExperiencia() == 0) it.remove();
}
pitufos.removeIf(p -> p.getExperiencia() == 0); // equivalente` },
      { type: 'warn', text: 'Llamar a lista.remove(...) dentro de un for-each sobre esa misma lista lanza ConcurrentModificationException.' },
      { type: 'h', text: 'La lista dentro de una clase' },
      { type: 'p', text: 'Lo habitual es que un objeto tenga una lista como atributo privado y ofrezca métodos con significado de dominio. Así controla qué se agrega y los cálculos sobre los elementos los hace él (experto en información).' },
      { type: 'code', caption: 'Lista encapsulada', code: `public class Aldea {
    private final List<Pitufo> pitufos = new ArrayList<>();

    public void agregar(Pitufo p) {
        if (!pitufos.contains(p)) pitufos.add(p);
    }

    public int experienciaTotal() {
        int total = 0;
        for (Pitufo p : pitufos) total += p.getExperiencia();
        return total;
    }

    public List<Pitufo> getPitufos() {
        return new ArrayList<>(pitufos); // copia: el cliente no puede modificar la interna
    }
}` },
      { type: 'h', text: 'Copias y referencias' },
      { type: 'p', text: 'La lista guarda referencias a los objetos, no copias. new ArrayList<>(otra) crea una lista nueva pero con los MISMOS objetos adentro (copia superficial): si modificás un Pitufo desde una lista, el cambio se ve desde la otra.' },
      { type: 'h', text: 'Ordenar' },
      { type: 'code', caption: 'Ordenar con un Comparator', code: `pitufos.sort(Comparator.comparing(Pitufo::getNombre));          // por nombre
pitufos.sort(Comparator.comparingInt(Pitufo::getExperiencia).reversed()); // mayor experiencia primero` },
      { type: 'h', text: 'List: programar contra la interfaz' },
      { type: 'p', text: 'Como List es una interfaz, no se puede hacer new List<>(). Sí se usa como tipo de variables, atributos, parámetros y retornos. Así el método acepta cualquier implementación y no queda acoplado a ArrayList.' },
      { type: 'code', caption: 'Parámetros y retornos de tipo List', code: `public int contarActivos(List<Pitufo> lista) { // sirve para ArrayList, LinkedList, List.of(...)
    int n = 0;
    for (Pitufo p : lista) if (p.estaActivo()) n++;
    return n;
}

List<Pitufo> a = new ArrayList<>();   // la más usada: acceso por índice rápido
List<Pitufo> b = new LinkedList<>();  // otra implementación, mismo protocolo` },
      { type: 'list', items: [
        'ArrayList: get(i) es inmediato; insertar o borrar al principio obliga a correr los elementos.',
        'LinkedList: insertar y borrar en los extremos es barato; get(i) recorre la lista.',
        'List.of(a, b, c): lista inmodificable. add o remove lanzan UnsupportedOperationException.',
        'Collections.unmodifiableList(lista): vista de sólo lectura de una lista existente (los cambios en la original se ven).',
        'List es un subtipo de Collection, que también incluye a Set (sin repetidos ni posiciones).',
      ] },
      { type: 'tip', text: 'List<Pitufo> no es subtipo de List<Personaje> aunque Pitufo extienda Personaje. Para aceptar listas de subclases usá List<? extends Personaje> (sólo para leer).' },
      { type: 'h', text: 'Errores frecuentes' },
      { type: 'list', items: [
        'get(i) con i fuera de 0..size()-1 lanza IndexOutOfBoundsException.',
        'Usar el atributo sin inicializar (sin = new ArrayList<>()) lanza NullPointerException al primer add.',
        'Comparar Integer de la lista con == en vez de equals: falla con valores grandes.',
        'Devolver la lista interna en un getter: el cliente puede agregar o borrar elementos sin pasar por la clase.',
      ] },
    ],
    exerciseIds: ['aliasing-equipo'],
  },
  // ======================= UNIDAD 2 =======================
  {
    id: 'herencia', unit: 'u2', title: 'Herencia, redefinición, this y super', concepts: ['herencia', 'redefinicion', 'this-super', 'constructores', 'visibilidad'],
    quizId: 'quiz-u2', animationIds: ['binding-dinamico', 'herencia-vs-composicion'],
    blocks: [
      { type: 'p', text: 'La herencia modela generalización/especialización: una subclase ES UN tipo de la superclase, hereda su estado y comportamiento y puede agregar o redefinir.' },
      { type: 'list', items: ['Redefinición (@Override): misma firma, nuevo comportamiento.', 'Sobrecarga: mismo nombre, distintos parámetros. Se resuelve en compilación.', 'super.metodo() invoca la versión de la superclase; super(...) encadena constructores y debe ser la primera sentencia.', 'this refiere al objeto receptor; this(...) llama a otro constructor de la misma clase.'] },
      { type: 'h', text: 'Visibilidad' },
      { type: 'list', items: ['private: sólo la clase.', 'package-private (sin modificador): las clases del mismo paquete.', 'protected: el paquete y las subclases.', 'public: todos.'] },
      { type: 'code', caption: 'Reutilizar con super en lugar de duplicar', code: `public class Capitan extends Jugador {
    public Capitan(String nombre, double basico, int goles) {
        super(nombre, basico, goles);
    }

    @Override
    public double getSueldo() {
        return super.getSueldo() * 1.2;
    }
}` },
      { type: 'h', text: 'Variables y métodos de clase' },
      { type: 'p', text: 'static pertenece a la clase y se comparte entre todas las instancias (contadores, constantes, fábricas). Un método static no tiene this ni participa del binding dinámico.' },
    ],
    exerciseIds: ['abstracta-super'],
  },
  {
    id: 'abstractas-interfaces', unit: 'u2', title: 'Clases abstractas e interfaces', concepts: ['abstractas', 'interfaces'],
    quizId: 'quiz-u2',
    blocks: [
      { type: 'p', text: 'Una clase abstracta no se instancia: define el protocolo común y el estado compartido; los métodos abstractos los completan las subclases concretas.' },
      { type: 'p', text: 'Una interfaz es un contrato puro (Java permite métodos default). Una clase puede implementar varias interfaces: es la forma de herencia múltiple de tipo en Java.' },
      { type: 'list', items: ['¿Comparten estado o implementación? → clase abstracta.', '¿Sólo comparten un rol que pueden cumplir clases no relacionadas? → interfaz.', 'Ejemplo: Condicion, Comparator<T>, Iterable<T> son interfaces; ElementoEnvio con nombre común suele ser abstracta.'] },
    ],
    exerciseIds: ['interfaz-figuras', 'abstracta-super'],
  },
  {
    id: 'relaciones', unit: 'u2', title: 'Asociación, agregación y composición', concepts: ['relaciones', 'composicion-vs-herencia'],
    quizId: 'quiz-u2', animationIds: ['relaciones', 'herencia-vs-composicion'],
    blocks: [
      { type: 'list', items: ['Asociación: un objeto conoce a otro (un Pedido conoce a su Cliente).', 'Agregación: relación todo-parte débil; las partes pueden existir solas (un Equipo y sus Jugadores).', 'Composición: todo-parte fuerte; las partes nacen y mueren con el todo (una Factura y sus Líneas).'] },
      { type: 'h', text: 'Composición frente a herencia' },
      { type: 'p', text: 'Heredar sólo para reutilizar código (class Brigada extends ArrayList<Pitufo>) expone métodos que rompen invariantes. Si no hay relación "es-un" real, usá composición: un atributo y delegación.' },
      { type: 'code', code: `// MAL: Brigada hereda clear(), remove(), set()...
public class Brigada extends ArrayList<Pitufo> { }

// BIEN: Brigada TIENE pitufos y decide qué expone
public class Brigada {
    private final List<Pitufo> pitufos = new ArrayList<>();
    public void agregar(Pitufo p) { pitufos.add(p); }
}` },
    ],
  },
  {
    id: 'template-method', unit: 'u2', title: 'Template Method y hooks', concepts: ['template-method', 'abstractas'],
    quizId: 'quiz-u4',
    blocks: [
      { type: 'p', text: 'Un método plantilla en la superclase fija el algoritmo y llama a pasos que las subclases completan (abstractos) o pueden ajustar (hooks con implementación por defecto).' },
      { type: 'code', code: `public abstract class Envio {
    public final double costo() {          // método plantilla
        return costoBase() + getPeso() * 10 + recargo();
    }
    protected abstract double costoBase(); // paso obligatorio
    protected double recargo() {           // hook
        return 0;
    }
}

public class EnvioExpress extends Envio {
    @Override protected double costoBase() { return 800; }
    @Override protected double recargo()   { return 1500; }
}` },
      { type: 'tip', text: 'En los recuperatorios aparece como "Contenedor Express": una variante que cambia sólo un paso del cálculo. Es la señal para usar Template Method + hook.' },
    ],
    exerciseIds: ['template-method-envio'],
  },
  // ======================= UNIDAD 3 =======================
  {
    id: 'polimorfismo', unit: 'u3', title: 'Polimorfismo y binding dinámico', concepts: ['polimorfismo', 'binding', 'sustitucion'],
    quizId: 'quiz-u3', animationIds: ['binding-dinamico', 'llamada-polimorfica'],
    blocks: [
      { type: 'p', text: 'El tipo estático de una variable es el declarado; el tipo dinámico es la clase del objeto referenciado en ejecución.' },
      { type: 'list', items: ['Compilación (binding estático): el compilador verifica que el mensaje exista en el tipo estático. También elige la sobrecarga.', 'Ejecución (binding dinámico): la JVM busca el método empezando por la clase del objeto real y subiendo por la jerarquía.'] },
      { type: 'code', code: `Empleado e = new Capitan("Díaz", 1000, 2);
e.getSueldo();   // compila porque Empleado declara getSueldo
                 // ejecuta Capitan.getSueldo (tipo dinámico)
e.getGoles();    // NO compila: Empleado no declara getGoles` },
      { type: 'h', text: 'Principio de sustitución' },
      { type: 'p', text: 'Donde se espera un objeto de la superclase debe poder usarse cualquier subclase sin romper el comportamiento esperado. Una subclase que lanza UnsupportedOperationException en un método heredado lo viola.' },
    ],
    exerciseIds: ['abstracta-super', 'interfaz-figuras'],
  },
  {
    id: 'excepciones', unit: 'u3', title: 'Excepciones', concepts: ['excepciones', 'diseno-excepciones'],
    quizId: 'quiz-u3', animationIds: ['excepciones'],
    blocks: [
      { type: 'list', items: ['throw lanza una excepción; throws la declara en la firma.', 'try/catch captura; finally se ejecuta siempre (haya o no excepción).', 'Checked (extienden Exception): situaciones esperables del dominio; el compilador obliga a capturar o declarar.', 'Unchecked (extienden RuntimeException): errores de programación (null, índices, argumentos inválidos).', 'Una excepción no capturada se propaga hacia el método llamador, desapilando la pila.'] },
      { type: 'code', code: `public void transferir(Cuenta destino, double monto) throws SaldoInsuficienteException {
    extraer(monto);          // si lanza, no se deposita
    destino.depositar(monto);
}

try {
    cuenta.transferir(otra, 500);
} catch (SaldoInsuficienteException e) {
    System.out.println("No alcanza: " + e.getMessage());
} finally {
    registrarIntento();
}` },
      { type: 'warn', text: 'catch (Exception e) {} oculta errores reales. Capturá sólo lo que sabés manejar y donde tenés contexto para hacerlo.' },
    ],
    exerciseIds: ['excepciones-cuenta'],
  },
  // ======================= UNIDAD 4 =======================
  {
    id: 'composite', unit: 'u4', title: 'Composite', concepts: ['composite', 'composite-busqueda', 'copia-profunda'],
    quizId: 'quiz-u4', animationIds: ['composite', 'copia'],
    blocks: [
      { type: 'p', text: 'Composite permite tratar de forma uniforme objetos simples (hojas) y agrupaciones (compuestos) que pueden anidarse sin límite. Es el patrón central de los parciales: contenedores de compras, tripulaciones, brigadas, secciones de noticias, lotes de cultivos.' },
      { type: 'code', caption: 'Estructura típica', code: `public abstract class ElementoEnvio {
    public abstract double getPeso();
    public abstract List<Compra> buscar(Condicion c);
    public abstract ElementoEnvio copia(Condicion c);
}

public class Contenedor extends ElementoEnvio {
    private final List<ElementoEnvio> elementos = new ArrayList<>();

    @Override
    public double getPeso() {
        double total = 0;
        for (ElementoEnvio e : elementos) total += e.getPeso();
        return total;
    }

    @Override
    public ElementoEnvio copia(Condicion c) {
        Contenedor nuevo = new Contenedor(getNombre());
        for (ElementoEnvio e : elementos) {
            ElementoEnvio hijo = e.copia(c);
            if (hijo != null) nuevo.agregar(hijo);
        }
        return nuevo.getCantidad() == 0 ? null : nuevo;
    }
}` },
      { type: 'list', items: ['Cálculos: suma (peso, fuerza), máximo (tiempo de entrega), promedio, cantidad.', 'Reglas "derivadas": la ciudad del contenedor es la de su primer elemento; está entregado si todos lo están.', 'Búsqueda: la hoja decide si cumple; el compuesto junta resultados.', 'Copia profunda: cada nodo crea uno nuevo y copia a sus hijos.'] },
      { type: 'warn', text: 'Errores frecuentes: listas separadas por tipo (List<Compra> y List<Contenedor>), instanceof para distinguir hijos, guardar totales en atributos que quedan desactualizados, copiar con addAll (copia superficial).' },
    ],
    exerciseIds: [],
  },
  {
    id: 'strategy-condiciones', unit: 'u4', title: 'Strategy y condiciones combinables', concepts: ['strategy', 'condiciones'],
    quizId: 'quiz-u4', animationIds: ['strategy'],
    blocks: [
      { type: 'p', text: 'Strategy encapsula un algoritmo variable en un objeto con una interfaz común. El contexto delega en la estrategia y puede cambiarla en ejecución.' },
      { type: 'p', text: 'Las condiciones son un caso particular: objetos que responden cumple(x). Con And, Or y Not se combinan en árboles arbitrarios (un Composite de condiciones).' },
      { type: 'code', code: `Condicion c = new CondicionAnd(
        new CondicionFuerzaMayor(500),
        new CondicionNot(new CondicionFrutaIgual("Logia")));
List<Personaje> r = tripulacion.buscar(c);` },
      { type: 'tip', text: 'Estrategias compuestas para desempatar (rápida, ecológica, maximizada) también se modelan como una estrategia que contiene otras, igual que thenComparing en Comparator.' },
    ],
  },
  {
    id: 'comparator', unit: 'u4', title: 'Comparator y Comparable', concepts: ['comparator', 'comparable'],
    quizId: 'quiz-u4', animationIds: ['comparator'],
    blocks: [
      { type: 'p', text: 'compare(a, b) devuelve negativo si a va antes, positivo si va después y 0 si son equivalentes. Comparable define el orden natural dentro de la clase (compareTo); Comparator define órdenes externos e intercambiables.' },
      { type: 'code', code: `// clásico
public int compare(Pitufo p1, Pitufo p2) {
    int res = Integer.compare(p2.getExperiencia(), p1.getExperiencia()); // desc
    if (res == 0) res = p1.getNombre().compareTo(p2.getNombre());
    return res;
}

// equivalente con la API de Comparator
Comparator<Pitufo> c = Comparator.comparingInt(Pitufo::getExperiencia)
        .reversed()
        .thenComparing(Pitufo::getNombre);` },
      { type: 'warn', text: 'return a.getPeso() - b.getPeso(); puede desbordar con int y trunca con double. Usá Integer.compare / Double.compare.' },
    ],
    exerciseIds: ['comparator-pitufo-experiencia', 'comparable-producto'],
  },
  {
    id: 'otros-patrones', unit: 'u4', title: 'Decorator, State, Observer e Iterator', concepts: ['decorator', 'state', 'observer', 'iterator'],
    quizId: 'quiz-u4',
    blocks: [
      { type: 'list', items: ['Decorator: envuelve un objeto con otro de la misma interfaz para agregar comportamiento (bebida con leche y crema).', 'State: el objeto delega en su estado actual; cada estado sabe a cuál pasar.', 'Observer: el sujeto notifica a una lista de observadores sin conocer qué hacen.', 'Iterator: recorrer una colección sin exponer cómo está guardada (Iterable / Iterator).'] },
      { type: 'warn', text: 'Abuso de patrones: si sólo hay una variante y no se espera otra, una Strategy o un Decorator es sobrediseño.' },
    ],
    exerciseIds: ['decorator-bebidas', 'state-pedido', 'observer-subasta', 'iterator-rango'],
  },
  // ======================= UNIDAD 5 =======================
  {
    id: 'malas-practicas', unit: 'u5', title: 'Catálogo de malas prácticas', concepts: ['malas-practicas', 'acoplamiento', 'instanceof', 'exposicion', 'sobrediseno'],
    quizId: 'quiz-u5',
    blocks: [
      { type: 'p', text: 'El analizador de la plataforma detecta automáticamente la mayoría de estos problemas. Distingue error real (el programa falla), mala práctica (funciona pero el diseño es frágil) y mejora opcional.' },
      { type: 'list', items: [
        'Clase Dios: una clase que sabe y hace todo.',
        'Métodos largos y código duplicado.',
        'Acoplamiento fuerte: depender de ArrayList en vez de List, o de clases concretas en vez de abstracciones.',
        'Baja cohesión: una clase con responsabilidades no relacionadas.',
        'instanceof, casts y cadenas de if por tipo: falta polimorfismo.',
        'Campos públicos y colecciones internas expuestas.',
        'Getters y setters para todo: lógica fuera del objeto.',
        'Herencia sólo para reutilizar código.',
        'catch genérico o vacío: excepciones ocultadas.',
        'Copias superficiales donde se pide copia profunda.',
        'Strings con ==, doubles con ==, restas en Comparator.',
        'Violaciones del principio de sustitución.',
        'Sobrediseño: patrones sin variación real que los justifique.',
      ] },
    ],
  },
]

export const lessonById = (id: string) => LESSONS.find((l) => l.id === id)
