import type { Exercise, Rubric } from '../models/types'
import { leafSource } from '../controllers/generation/javaGen'
import { domainById } from './domains'

// Ejercicios aislados escritos a mano (temas puntuales). Los generados viven en
// controllers/generation/templates.ts.

const rubric: Rubric = {
  items: [
    { id: 'tests', description: 'Tests', points: 70, kind: 'tests' },
    { id: 'req', description: 'Requisitos', points: 20, kind: 'requirements' },
    { id: 'analysis', description: 'Buenas prácticas', points: 10, kind: 'analysis' },
  ],
}
const base = { seed: 0, rubric }
const pitufos = domainById('pitufos')!

export const STATIC_EXERCISES: Exercise[] = [
  // ------------------------------------------------------------------
  {
    ...base,
    id: 'comparator-pitufo-experiencia',
    title: 'Comparator: mayor experiencia primero',
    domain: 'Pitufos y brigadas',
    statement:
      'La clase **Pitufo** tiene nombre, experiencia, velocidad, creatividad, peso y habilidad.\n\nCompletá **ComparadorPorExperiencia** para que los pitufos con **mayor experiencia vayan primero**; a igual experiencia, **orden alfabético por nombre**.',
    concepts: ['comparator'],
    difficulty: 'introductory',
    format: 'code-fragment',
    supportFiles: [{ name: 'Pitufo.java', content: leafSource(pitufos), readonly: true }],
    starterCode: [
      {
        name: 'ComparadorPorExperiencia.java',
        content: `import java.util.Comparator;

public class ComparadorPorExperiencia implements Comparator<Pitufo> {
    @Override
    public int compare(Pitufo p1, Pitufo p2) {
        // El estudiante completa esta parte
        return 0;
    }
}
`,
      },
    ],
    requirements: [
      { id: 'no-resta', description: 'No usar restas', check: { pattern: 'return[^;]*[\\w)]\\s*-\\s*[\\w(]', mustMatch: false } },
      { id: 'no-string-eq', description: 'No comparar Strings con ==', check: { pattern: 'getNombre\\(\\)\\s*[!=]=', mustMatch: false } },
    ],
    visibleTests: [
      {
        id: 'orden',
        name: 'Ordena por experiencia descendente',
        body: `List<Pitufo> l = new ArrayList<>(List.of(
    new Pitufo("Tímido", 10, 5, 3, 1.0, "magia"),
    new Pitufo("Fortachón", 90, 20, 2, 2.5, "construcción"),
    new Pitufo("Poeta", 40, 8, 9, 0.9, "música")));
l.sort(new ComparadorPorExperiencia());
eq("Fortachón", l.get(0).getNombre());
eq("Tímido", l.get(2).getNombre());`,
      },
    ],
    hiddenTests: [
      {
        id: 'desempate',
        name: 'Desempata por nombre',
        body: `Pitufo a = new Pitufo("Bromista", 50, 1, 1, 1.0, "cocina");
Pitufo b = new Pitufo("Gruñón", 50, 9, 1, 1.0, "cocina");
check(new ComparadorPorExperiencia().compare(a, b) < 0, "Bromista debería ir antes que Gruñón");
check(new ComparadorPorExperiencia().compare(b, a) > 0, "Gruñón debería ir después que Bromista");`,
      },
      { id: 'cero', name: 'compare(a, a) == 0', body: `Pitufo a = new Pitufo("Goloso", 7, 1, 1, 1.0, "cocina");\neq(0, new ComparadorPorExperiencia().compare(a, a));` },
      {
        id: 'extremos',
        name: 'No desborda con valores extremos',
        body: `Pitufo a = new Pitufo("A", Integer.MAX_VALUE, 1, 1, 1.0, "x");
Pitufo b = new Pitufo("B", Integer.MIN_VALUE, 1, 1, 1.0, "x");
check(new ComparadorPorExperiencia().compare(a, b) < 0, "El de mayor experiencia debe ir primero (¿usaste una resta?)");`,
      },
    ],
    referenceSolution: [
      {
        name: 'ComparadorPorExperiencia.java',
        content: `import java.util.Comparator;

public class ComparadorPorExperiencia implements Comparator<Pitufo> {
    @Override
    public int compare(Pitufo p1, Pitufo p2) {
        int res = Integer.compare(p2.getExperiencia(), p1.getExperiencia());
        if (res == 0) {
            res = p1.getNombre().compareTo(p2.getNombre());
        }
        return res;
    }
}
`,
      },
    ],
    hints: [
      { level: 1, text: 'Para orden descendente comparás p2 contra p1.' },
      { level: 2, text: 'Integer.compare(p2.getExperiencia(), p1.getExperiencia())' },
      { level: 3, text: 'Si el resultado es 0, devolvé p1.getNombre().compareTo(p2.getNombre()).' },
    ],
    explanation:
      'Alternativa equivalente: Comparator.comparingInt(Pitufo::getExperiencia).reversed().thenComparing(Pitufo::getNombre). La resta p2.getExperiencia() - p1.getExperiencia() falla con valores extremos por overflow.',
  },
  // ------------------------------------------------------------------
  {
    ...base,
    id: 'equals-hashcode',
    title: 'Implementar equals y hashCode',
    domain: 'Personajes de One Piece',
    statement:
      'Dos **Personaje** son iguales si tienen el **mismo nombre y la misma edad** (la recompensa no importa).\n\nRedefiní `equals(Object o)` y `hashCode()` respetando sus contratos, para que funcionen en HashSet y en `List.contains`.',
    concepts: ['identidad-igualdad', 'redefinicion'],
    difficulty: 'introductory',
    format: 'code-fragment',
    starterCode: [
      {
        name: 'Personaje.java',
        content: `import java.util.*;

public class Personaje {
    private final String nombre;
    private final int edad;
    private final long recompensa;

    public Personaje(String nombre, int edad, long recompensa) {
        this.nombre = nombre;
        this.edad = edad;
        this.recompensa = recompensa;
    }

    public String getNombre() {
        return nombre;
    }

    public int getEdad() {
        return edad;
    }

    public long getRecompensa() {
        return recompensa;
    }

    // Completá equals y hashCode
}
`,
      },
    ],
    requirements: [
      { id: 'firma', description: 'equals recibe Object (redefinición, no sobrecarga)', check: { pattern: 'boolean\\s+equals\\s*\\(\\s*Object\\s+\\w+\\s*\\)', mustMatch: true } },
      { id: 'hash', description: 'Redefine hashCode', check: { pattern: 'int\\s+hashCode\\s*\\(\\s*\\)', mustMatch: true } },
    ],
    visibleTests: [
      { id: 'iguales', name: 'Mismo nombre y edad son iguales', body: `eq(new Personaje("Luffy", 19, 100), new Personaje(new String("Luffy"), 19, 999));` },
    ],
    hiddenTests: [
      { id: 'distintos', name: 'Distinta edad no son iguales', body: `check(!new Personaje("Luffy", 19, 1).equals(new Personaje("Luffy", 20, 1)), "Edad distinta");` },
      { id: 'null', name: 'equals(null) es false', body: `check(!new Personaje("Zoro", 21, 1).equals(null), "equals(null) debe ser false");` },
      { id: 'otro-tipo', name: 'equals con otro tipo es false', body: `check(!new Personaje("Zoro", 21, 1).equals("Zoro"), "Otro tipo");` },
      { id: 'hash', name: 'Iguales tienen el mismo hashCode', body: `eq(new Personaje("Nami", 20, 1).hashCode(), new Personaje(new String("Nami"), 20, 5).hashCode());` },
      { id: 'hashset', name: 'HashSet no guarda duplicados', body: `Set<Personaje> s = new HashSet<>();\ns.add(new Personaje("Nami", 20, 1));\ns.add(new Personaje(new String("Nami"), 20, 2));\neq(1, s.size());` },
      { id: 'contains', name: 'List.contains usa equals', body: `List<Personaje> l = new ArrayList<>(List.of(new Personaje("Usopp", 19, 0)));\ncheck(l.contains(new Personaje("Usopp", 19, 50)), "contains debe usar equals");` },
    ],
    referenceSolution: [
      {
        name: 'Personaje.java',
        content: `import java.util.*;

public class Personaje {
    private final String nombre;
    private final int edad;
    private final long recompensa;

    public Personaje(String nombre, int edad, long recompensa) {
        this.nombre = nombre;
        this.edad = edad;
        this.recompensa = recompensa;
    }

    public String getNombre() {
        return nombre;
    }

    public int getEdad() {
        return edad;
    }

    public long getRecompensa() {
        return recompensa;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        Personaje otro = (Personaje) o;
        return edad == otro.edad && nombre.equals(otro.nombre);
    }

    @Override
    public int hashCode() {
        return Objects.hash(nombre, edad);
    }
}
`,
      },
    ],
    hints: [
      { level: 1, text: 'La firma correcta es public boolean equals(Object o). Con otro tipo de parámetro es una sobrecarga y HashSet no la usa.' },
      { level: 2, text: 'Primero descartá null y otras clases; después casteá y compará nombre con equals y edad con ==.' },
      { level: 3, text: 'hashCode debe usar los mismos atributos: Objects.hash(nombre, edad).' },
    ],
    explanation: 'equals define igualdad de contenido; == sigue comparando identidad. Si dos objetos son equals, deben tener el mismo hashCode o las colecciones hash los tratan como distintos.',
  },
  // ------------------------------------------------------------------
  {
    ...base,
    id: 'comparable-producto',
    title: 'Implementar compareTo (Comparable)',
    domain: 'Coleccionables',
    statement:
      'El **orden natural** de un **Producto** es por **precio ascendente**; a igual precio, por **nombre** alfabético.\n\nHacé que Producto implemente `Comparable<Producto>` para que `Collections.sort(lista)` funcione sin pasar un Comparator.',
    concepts: ['comparable', 'comparator'],
    difficulty: 'introductory',
    format: 'code-fragment',
    starterCode: [
      {
        name: 'Producto.java',
        content: `public class Producto {
    private final String nombre;
    private final double precio;

    public Producto(String nombre, double precio) {
        this.nombre = nombre;
        this.precio = precio;
    }

    public String getNombre() {
        return nombre;
    }

    public double getPrecio() {
        return precio;
    }
}
`,
      },
    ],
    requirements: [
      { id: 'comparable', description: 'Implementa Comparable<Producto>', check: { pattern: 'implements\\s+Comparable\\s*<\\s*Producto\\s*>', mustMatch: true } },
      { id: 'no-resta', description: 'No usar restas', check: { pattern: 'return[^;]*[\\w)]\\s*-\\s*[\\w(]', mustMatch: false } },
    ],
    visibleTests: [
      { id: 'sort', name: 'Collections.sort ordena por precio', body: `List<Producto> l = new ArrayList<>(List.of(new Producto("B", 30.5), new Producto("A", 10.0), new Producto("C", 20.0)));\nCollections.sort(l);\neq("A", l.get(0).getNombre());\neq("B", l.get(2).getNombre());` },
    ],
    hiddenTests: [
      { id: 'decimales', name: 'Diferencias menores a 1 se respetan', body: `check(new Producto("X", 10.2).compareTo(new Producto("Y", 10.6)) < 0, "10.2 va antes que 10.6 (¿casteaste una resta a int?)");` },
      { id: 'desempate', name: 'Desempate por nombre', body: `check(new Producto("Ana", 5.0).compareTo(new Producto("Beto", 5.0)) < 0, "Ana antes que Beto");` },
      { id: 'cero', name: 'Iguales devuelven 0', body: `eq(0, new Producto("Z", 1.0).compareTo(new Producto("Z", 1.0)));` },
    ],
    referenceSolution: [
      {
        name: 'Producto.java',
        content: `public class Producto implements Comparable<Producto> {
    private final String nombre;
    private final double precio;

    public Producto(String nombre, double precio) {
        this.nombre = nombre;
        this.precio = precio;
    }

    public String getNombre() {
        return nombre;
    }

    public double getPrecio() {
        return precio;
    }

    @Override
    public int compareTo(Producto otro) {
        int res = Double.compare(precio, otro.precio);
        if (res == 0) {
            res = nombre.compareTo(otro.nombre);
        }
        return res;
    }
}
`,
      },
    ],
    hints: [
      { level: 1, text: 'Comparable define el orden natural dentro de la propia clase: compareTo(Producto otro).' },
      { level: 2, text: 'Double.compare(precio, otro.precio) evita el truncado de (int)(precio - otro.precio).' },
      { level: 3, text: 'Si da 0, compará nombres con compareTo.' },
    ],
    explanation: 'Comparable se usa cuando hay un único orden "natural". Para órdenes alternativos se usan Comparators externos.',
  },
  // ------------------------------------------------------------------
  {
    ...base,
    id: 'abstracta-super',
    title: 'Clase abstracta, redefinición y super',
    domain: 'Equipos y jugadores',
    statement:
      'Un club paga a sus **Empleado**s. Todo empleado tiene nombre y sueldo básico; el **sueldo** se calcula distinto según el tipo:\n\n- **Empleado** es abstracta y declara `abstract double getSueldo()`.\n- **Jugador**: sueldo básico + 1000 por cada gol.\n- **Capitan** (es un Jugador): lo mismo que un Jugador **más un 20%**. Usá `super.getSueldo()` para no duplicar código.\n\nCompletá Jugador y Capitan (constructores incluidos).',
    concepts: ['abstractas', 'herencia', 'redefinicion', 'this-super', 'constructores'],
    difficulty: 'intermediate',
    format: 'code-fragment',
    supportFiles: [
      {
        name: 'Empleado.java',
        readonly: true,
        content: `public abstract class Empleado {
    private final String nombre;
    private final double basico;

    public Empleado(String nombre, double basico) {
        this.nombre = nombre;
        this.basico = basico;
    }

    public String getNombre() {
        return nombre;
    }

    protected double getBasico() {
        return basico;
    }

    public abstract double getSueldo();
}
`,
      },
    ],
    starterCode: [
      { name: 'Jugador.java', content: `public class Jugador extends Empleado {\n    // Completá: atributo goles, constructor Jugador(String nombre, double basico, int goles) y getSueldo\n}\n` },
      { name: 'Capitan.java', content: `public class Capitan extends Jugador {\n    // Completá: constructor Capitan(String nombre, double basico, int goles) y getSueldo\n}\n` },
    ],
    requirements: [
      { id: 'super', description: 'Capitan usa super.getSueldo()', check: { file: 'Capitan.java', pattern: 'super\\.getSueldo\\s*\\(', mustMatch: true } },
      { id: 'ctor', description: 'Los constructores encadenan con super(...)', check: { pattern: 'super\\s*\\(', mustMatch: true } },
    ],
    visibleTests: [{ id: 'jugador', name: 'Sueldo de un jugador', body: `eqD(15000, new Jugador("Romero", 10000, 5).getSueldo());` }],
    hiddenTests: [
      { id: 'capitan', name: 'Sueldo de un capitán', body: `eqD(18000, new Capitan("Díaz", 10000, 5).getSueldo());` },
      { id: 'polimorfismo', name: 'Polimorfismo con referencias a Empleado', body: `List<Empleado> l = List.of(new Jugador("A", 1000, 1), new Capitan("B", 1000, 1));\ndouble total = 0;\nfor (Empleado e : l) total += e.getSueldo();\neqD(2000 + 2400, total);` },
      { id: 'sin-goles', name: 'Jugador sin goles cobra el básico', body: `eqD(500, new Jugador("C", 500, 0).getSueldo());` },
    ],
    referenceSolution: [
      {
        name: 'Jugador.java',
        content: `public class Jugador extends Empleado {
    private final int goles;

    public Jugador(String nombre, double basico, int goles) {
        super(nombre, basico);
        this.goles = goles;
    }

    public int getGoles() {
        return goles;
    }

    @Override
    public double getSueldo() {
        return getBasico() + 1000 * goles;
    }
}
`,
      },
      {
        name: 'Capitan.java',
        content: `public class Capitan extends Jugador {
    public Capitan(String nombre, double basico, int goles) {
        super(nombre, basico, goles);
    }

    @Override
    public double getSueldo() {
        return super.getSueldo() * 1.2;
    }
}
`,
      },
    ],
    hints: [
      { level: 1, text: 'El constructor de la subclase debe llamar primero a super(nombre, basico).' },
      { level: 2, text: 'basico es private en Empleado: usá getBasico(), que es protected.' },
      { level: 3, text: 'En Capitan: return super.getSueldo() * 1.2;' },
    ],
    explanation: 'La clase abstracta fija el protocolo (getSueldo) y el estado común. Cada subclase redefine el cálculo; Capitan reutiliza el de Jugador con super en vez de copiarlo. El cliente usa referencias a Empleado y el binding dinámico elige la versión correcta.',
  },
  // ------------------------------------------------------------------
  {
    ...base,
    id: 'template-method-envio',
    title: 'Template Method con hook: envío express',
    domain: 'Entregas y contenedores',
    statement:
      'El **costo** de un envío siempre se calcula igual: `costoBase() + peso * 10 + recargo()`.\n\n- **Envio** (abstracta) define el método plantilla `costo()` como **final**, el método abstracto `costoBase()` y el **hook** `recargo()` que por defecto devuelve 0.\n- **EnvioComun**: costoBase 500.\n- **EnvioExpress**: costoBase 800 y redefine el hook: recargo de 1500.\n\nCompletá las tres clases.',
    concepts: ['template-method', 'abstractas', 'redefinicion'],
    difficulty: 'intermediate',
    format: 'code-fragment',
    starterCode: [
      { name: 'Envio.java', content: `public abstract class Envio {\n    private final double peso;\n\n    public Envio(double peso) {\n        this.peso = peso;\n    }\n\n    public double getPeso() {\n        return peso;\n    }\n\n    // Completá: costo() (final), costoBase() abstracto y recargo() hook\n}\n` },
      { name: 'EnvioComun.java', content: `public class EnvioComun extends Envio {\n    // Completá\n}\n` },
      { name: 'EnvioExpress.java', content: `public class EnvioExpress extends Envio {\n    // Completá\n}\n` },
    ],
    requirements: [
      { id: 'final', description: 'costo() es final (el algoritmo no se redefine)', check: { file: 'Envio.java', pattern: 'final\\s+double\\s+costo\\s*\\(', mustMatch: true } },
      { id: 'hook', description: 'recargo() tiene implementación por defecto en Envio', check: { file: 'Envio.java', pattern: 'double\\s+recargo\\s*\\(\\s*\\)\\s*\\{', mustMatch: true } },
      { id: 'comun-sin-recargo', description: 'EnvioComun no redefine el hook', check: { file: 'EnvioComun.java', pattern: 'recargo', mustMatch: false } },
    ],
    visibleTests: [{ id: 'comun', name: 'Costo de un envío común', body: `eqD(500 + 20, new EnvioComun(2).costo());` }],
    hiddenTests: [
      { id: 'express', name: 'Costo de un envío express', body: `eqD(800 + 30 + 1500, new EnvioExpress(3).costo());` },
      { id: 'polimorfico', name: 'Total polimórfico', body: `List<Envio> l = List.of(new EnvioComun(1), new EnvioExpress(1));\ndouble t = 0;\nfor (Envio e : l) t += e.costo();\neqD(510 + 2310, t);` },
    ],
    referenceSolution: [
      {
        name: 'Envio.java',
        content: `public abstract class Envio {
    private final double peso;

    public Envio(double peso) {
        this.peso = peso;
    }

    public double getPeso() {
        return peso;
    }

    public final double costo() {
        return costoBase() + peso * 10 + recargo();
    }

    protected abstract double costoBase();

    protected double recargo() {
        return 0;
    }
}
`,
      },
      { name: 'EnvioComun.java', content: `public class EnvioComun extends Envio {\n    public EnvioComun(double peso) {\n        super(peso);\n    }\n\n    @Override\n    protected double costoBase() {\n        return 500;\n    }\n}\n` },
      { name: 'EnvioExpress.java', content: `public class EnvioExpress extends Envio {\n    public EnvioExpress(double peso) {\n        super(peso);\n    }\n\n    @Override\n    protected double costoBase() {\n        return 800;\n    }\n\n    @Override\n    protected double recargo() {\n        return 1500;\n    }\n}\n` },
    ],
    hints: [
      { level: 1, text: 'El método plantilla vive en la superclase y llama a los pasos variables.' },
      { level: 2, text: 'Un hook es un método con implementación por defecto que las subclases pueden (no deben) redefinir.' },
      { level: 3, text: 'final en costo() impide que una subclase cambie el algoritmo.' },
    ],
    explanation: 'Template Method fija el esqueleto del algoritmo en la superclase. costoBase es un paso obligatorio (abstracto) y recargo es un hook opcional. Así, EnvioComun no necesita saber que existe un recargo.',
  },
  // ------------------------------------------------------------------
  {
    ...base,
    id: 'interfaz-figuras',
    title: 'Implementar una interfaz',
    domain: 'Geometría',
    statement:
      'La interfaz **Figura** declara `double area()` y `double perimetro()`.\n\nImplementá **Circulo** (radio) y **Rectangulo** (base, altura). Después, en **Calculadora**, implementá `static double areaTotal(List<Figura> figuras)` sin preguntar por el tipo de cada figura.',
    concepts: ['interfaces', 'polimorfismo'],
    difficulty: 'introductory',
    format: 'code-fragment',
    supportFiles: [{ name: 'Figura.java', readonly: true, content: `public interface Figura {\n    double area();\n\n    double perimetro();\n}\n` }],
    starterCode: [
      { name: 'Circulo.java', content: `public class Circulo implements Figura {\n    // Completá: constructor Circulo(double radio)\n}\n` },
      { name: 'Rectangulo.java', content: `public class Rectangulo implements Figura {\n    // Completá: constructor Rectangulo(double base, double altura)\n}\n` },
      { name: 'Calculadora.java', content: `import java.util.*;\n\npublic class Calculadora {\n    public static double areaTotal(List<Figura> figuras) {\n        return 0;\n    }\n}\n` },
    ],
    requirements: [
      { id: 'no-instanceof', description: 'Sin instanceof', check: { pattern: '\\binstanceof\\b', mustMatch: false } },
      { id: 'list', description: 'areaTotal recibe List<Figura>', check: { file: 'Calculadora.java', pattern: 'List\\s*<\\s*Figura\\s*>', mustMatch: true } },
    ],
    visibleTests: [{ id: 'rect', name: 'Área de un rectángulo', body: `eqD(12, new Rectangulo(3, 4).area());` }],
    hiddenTests: [
      { id: 'circ', name: 'Área de un círculo', body: `eqD(Math.PI * 4, new Circulo(2).area());` },
      { id: 'per', name: 'Perímetros', body: `eqD(14, new Rectangulo(3, 4).perimetro());\neqD(2 * Math.PI, new Circulo(1).perimetro());` },
      { id: 'total', name: 'Área total polimórfica', body: `eqD(12 + Math.PI, Calculadora.areaTotal(List.of(new Rectangulo(3, 4), new Circulo(1))));` },
    ],
    referenceSolution: [
      { name: 'Circulo.java', content: `public class Circulo implements Figura {\n    private final double radio;\n\n    public Circulo(double radio) {\n        this.radio = radio;\n    }\n\n    @Override\n    public double area() {\n        return Math.PI * radio * radio;\n    }\n\n    @Override\n    public double perimetro() {\n        return 2 * Math.PI * radio;\n    }\n}\n` },
      { name: 'Rectangulo.java', content: `public class Rectangulo implements Figura {\n    private final double base;\n    private final double altura;\n\n    public Rectangulo(double base, double altura) {\n        this.base = base;\n        this.altura = altura;\n    }\n\n    @Override\n    public double area() {\n        return base * altura;\n    }\n\n    @Override\n    public double perimetro() {\n        return 2 * (base + altura);\n    }\n}\n` },
      { name: 'Calculadora.java', content: `import java.util.*;\n\npublic class Calculadora {\n    public static double areaTotal(List<Figura> figuras) {\n        double total = 0;\n        for (Figura f : figuras) {\n            total += f.area();\n        }\n        return total;\n    }\n}\n` },
    ],
    hints: [
      { level: 1, text: 'Una clase que implementa una interfaz debe implementar todos sus métodos.' },
      { level: 2, text: 'En areaTotal, cada figura sabe calcular su área: f.area().' },
      { level: 3, text: 'Recorré la lista y acumulá: total += f.area().' },
    ],
    explanation: 'La interfaz es un contrato: Calculadora depende sólo de Figura y funciona con cualquier figura futura sin modificarse.',
  },
  // ------------------------------------------------------------------
  {
    ...base,
    id: 'decorator-bebidas',
    title: 'Decorator: agregados a una bebida',
    domain: 'Cafetería',
    statement:
      'Una **Bebida** tiene `double costo()` y `String descripcion()`. **Cafe** cuesta 1000 y su descripción es "Café".\n\nImplementá los decoradores **ConLeche** (+300, agrega ", leche") y **ConCrema** (+450, agrega ", crema"). Deben poder combinarse en cualquier orden y cantidad: `new ConCrema(new ConLeche(new Cafe()))`.',
    concepts: ['decorator', 'interfaces', 'composicion-vs-herencia'],
    difficulty: 'intermediate',
    format: 'code-fragment',
    supportFiles: [
      { name: 'Bebida.java', readonly: true, content: `public interface Bebida {\n    double costo();\n\n    String descripcion();\n}\n` },
      { name: 'Cafe.java', readonly: true, content: `public class Cafe implements Bebida {\n    @Override\n    public double costo() {\n        return 1000;\n    }\n\n    @Override\n    public String descripcion() {\n        return "Café";\n    }\n}\n` },
    ],
    starterCode: [
      { name: 'ConLeche.java', content: `public class ConLeche implements Bebida {\n    // Completá\n}\n` },
      { name: 'ConCrema.java', content: `public class ConCrema implements Bebida {\n    // Completá\n}\n` },
    ],
    requirements: [{ id: 'envuelve', description: 'Los decoradores guardan una Bebida', check: { pattern: 'Bebida\\s+\\w+\\s*;', mustMatch: true } }],
    visibleTests: [{ id: 'leche', name: 'Café con leche', body: `Bebida b = new ConLeche(new Cafe());\neqD(1300, b.costo());\neq("Café, leche", b.descripcion());` }],
    hiddenTests: [
      { id: 'doble', name: 'Café con leche y crema', body: `Bebida b = new ConCrema(new ConLeche(new Cafe()));\neqD(1750, b.costo());\neq("Café, leche, crema", b.descripcion());` },
      { id: 'repetido', name: 'Doble crema', body: `eqD(1900, new ConCrema(new ConCrema(new Cafe())).costo());` },
    ],
    referenceSolution: [
      { name: 'ConLeche.java', content: `public class ConLeche implements Bebida {\n    private final Bebida bebida;\n\n    public ConLeche(Bebida bebida) {\n        this.bebida = bebida;\n    }\n\n    @Override\n    public double costo() {\n        return bebida.costo() + 300;\n    }\n\n    @Override\n    public String descripcion() {\n        return bebida.descripcion() + ", leche";\n    }\n}\n` },
      { name: 'ConCrema.java', content: `public class ConCrema implements Bebida {\n    private final Bebida bebida;\n\n    public ConCrema(Bebida bebida) {\n        this.bebida = bebida;\n    }\n\n    @Override\n    public double costo() {\n        return bebida.costo() + 450;\n    }\n\n    @Override\n    public String descripcion() {\n        return bebida.descripcion() + ", crema";\n    }\n}\n` },
    ],
    hints: [
      { level: 1, text: 'El decorador ES una Bebida y además TIENE una Bebida.' },
      { level: 2, text: 'costo() delega en la bebida envuelta y suma lo propio.' },
      { level: 3, text: 'Como el decorador recibe cualquier Bebida, puede envolver a otro decorador.' },
    ],
    explanation: 'Decorator agrega responsabilidades por composición. Con herencia harían falta clases para cada combinación (CafeConLecheYCrema...).',
  },
  // ------------------------------------------------------------------
  {
    ...base,
    id: 'state-pedido',
    title: 'State: ciclo de vida de un pedido',
    domain: 'Entregas y contenedores',
    statement:
      'Un **Pedido** pasa por los estados **Pendiente → Enviado → Entregado**.\n\n- `avanzar()` pasa al estado siguiente; en Entregado lanza `IllegalStateException`.\n- `puedeCancelarse()` es true sólo en Pendiente.\n- `getNombreEstado()` devuelve "Pendiente", "Enviado" o "Entregado".\n\nEl Pedido **no** debe usar if/switch sobre el estado: delega en un objeto **EstadoPedido**. Implementá las tres clases de estado y completá Pedido.',
    concepts: ['state', 'polimorfismo', 'excepciones'],
    difficulty: 'advanced',
    format: 'code-fragment',
    supportFiles: [{ name: 'EstadoPedido.java', readonly: true, content: `public interface EstadoPedido {\n    EstadoPedido siguiente();\n\n    boolean puedeCancelarse();\n\n    String nombre();\n}\n` }],
    starterCode: [
      { name: 'Pedido.java', content: `public class Pedido {\n    private EstadoPedido estado = new Pendiente();\n\n    public void avanzar() {\n    }\n\n    public boolean puedeCancelarse() {\n        return false;\n    }\n\n    public String getNombreEstado() {\n        return "";\n    }\n}\n` },
      { name: 'Pendiente.java', content: `public class Pendiente implements EstadoPedido {\n    // Completá\n}\n` },
      { name: 'Enviado.java', content: `public class Enviado implements EstadoPedido {\n    // Completá\n}\n` },
      { name: 'Entregado.java', content: `public class Entregado implements EstadoPedido {\n    // Completá\n}\n` },
    ],
    requirements: [{ id: 'sin-if', description: 'Pedido no pregunta por el estado con if/switch/instanceof', check: { file: 'Pedido.java', pattern: '\\bif\\b|\\bswitch\\b|instanceof', mustMatch: false } }],
    visibleTests: [{ id: 'inicial', name: 'Empieza Pendiente', body: `Pedido p = new Pedido();\neq("Pendiente", p.getNombreEstado());\ncheck(p.puedeCancelarse(), "Pendiente puede cancelarse");` }],
    hiddenTests: [
      { id: 'avanza', name: 'Avanza hasta Entregado', body: `Pedido p = new Pedido();\np.avanzar();\neq("Enviado", p.getNombreEstado());\ncheck(!p.puedeCancelarse(), "Enviado no puede cancelarse");\np.avanzar();\neq("Entregado", p.getNombreEstado());` },
      { id: 'final', name: 'No avanza desde Entregado', body: `Pedido p = new Pedido();\np.avanzar();\np.avanzar();\ntry {\n    p.avanzar();\n    check(false, "Debía lanzar IllegalStateException");\n} catch (IllegalStateException e) {\n    eq("Entregado", p.getNombreEstado());\n}` },
    ],
    referenceSolution: [
      { name: 'Pedido.java', content: `public class Pedido {\n    private EstadoPedido estado = new Pendiente();\n\n    public void avanzar() {\n        estado = estado.siguiente();\n    }\n\n    public boolean puedeCancelarse() {\n        return estado.puedeCancelarse();\n    }\n\n    public String getNombreEstado() {\n        return estado.nombre();\n    }\n}\n` },
      { name: 'Pendiente.java', content: `public class Pendiente implements EstadoPedido {\n    @Override\n    public EstadoPedido siguiente() {\n        return new Enviado();\n    }\n\n    @Override\n    public boolean puedeCancelarse() {\n        return true;\n    }\n\n    @Override\n    public String nombre() {\n        return "Pendiente";\n    }\n}\n` },
      { name: 'Enviado.java', content: `public class Enviado implements EstadoPedido {\n    @Override\n    public EstadoPedido siguiente() {\n        return new Entregado();\n    }\n\n    @Override\n    public boolean puedeCancelarse() {\n        return false;\n    }\n\n    @Override\n    public String nombre() {\n        return "Enviado";\n    }\n}\n` },
      { name: 'Entregado.java', content: `public class Entregado implements EstadoPedido {\n    @Override\n    public EstadoPedido siguiente() {\n        throw new IllegalStateException("El pedido ya fue entregado");\n    }\n\n    @Override\n    public boolean puedeCancelarse() {\n        return false;\n    }\n\n    @Override\n    public String nombre() {\n        return "Entregado";\n    }\n}\n` },
    ],
    hints: [
      { level: 1, text: 'Cada estado sabe cuál es el siguiente.' },
      { level: 2, text: 'Pedido.avanzar(): estado = estado.siguiente();' },
      { level: 3, text: 'Entregado.siguiente() lanza la excepción; como el estado no se reasigna, el pedido queda Entregado.' },
    ],
    explanation: 'State reemplaza los condicionales sobre "en qué estado estoy" por objetos estado polimórficos. Agregar un estado nuevo no modifica Pedido.',
  },
  // ------------------------------------------------------------------
  {
    ...base,
    id: 'excepciones-cuenta',
    title: 'Excepciones: validación de dominio',
    domain: 'Banco',
    statement:
      'Una **Cuenta** tiene titular y saldo.\n\n- El constructor lanza `IllegalArgumentException` si el saldo inicial es negativo (error de programación: unchecked).\n- `extraer(double monto)` lanza **SaldoInsuficienteException** (checked, la tenés que crear extendiendo Exception) si el monto supera el saldo; en ese caso el saldo no cambia.\n- `transferir(Cuenta destino, double monto)` **propaga** la excepción (throws) sin capturarla.',
    concepts: ['excepciones', 'diseno-excepciones'],
    difficulty: 'intermediate',
    format: 'code-fragment',
    starterCode: [
      { name: 'SaldoInsuficienteException.java', content: `public class SaldoInsuficienteException {\n    // Completá: debe ser checked\n}\n` },
      { name: 'Cuenta.java', content: `public class Cuenta {\n    private final String titular;\n    private double saldo;\n\n    public Cuenta(String titular, double saldoInicial) {\n        this.titular = titular;\n        this.saldo = saldoInicial;\n    }\n\n    public double getSaldo() {\n        return saldo;\n    }\n\n    public void depositar(double monto) {\n        saldo += monto;\n    }\n\n    // Completá extraer y transferir\n}\n` },
    ],
    requirements: [
      { id: 'checked', description: 'SaldoInsuficienteException extiende Exception (checked)', check: { file: 'SaldoInsuficienteException.java', pattern: 'extends\\s+Exception\\b', mustMatch: true } },
      { id: 'throws', description: 'transferir declara throws SaldoInsuficienteException', check: { file: 'Cuenta.java', pattern: 'transferir[^{]*throws\\s+SaldoInsuficienteException', mustMatch: true } },
      { id: 'no-catch', description: 'transferir no captura la excepción', check: { file: 'Cuenta.java', pattern: 'catch\\s*\\(\\s*SaldoInsuficienteException', mustMatch: false } },
    ],
    visibleTests: [{ id: 'ok', name: 'Extracción válida', body: `Cuenta c = new Cuenta("Ana", 100);\nc.extraer(30);\neqD(70, c.getSaldo());` }],
    hiddenTests: [
      { id: 'insuf', name: 'Saldo insuficiente lanza y no modifica', body: `Cuenta c = new Cuenta("Ana", 100);\ntry {\n    c.extraer(500);\n    check(false, "Debía lanzar SaldoInsuficienteException");\n} catch (SaldoInsuficienteException e) {\n    eqD(100, c.getSaldo());\n}` },
      { id: 'negativo', name: 'Saldo inicial negativo', body: `try {\n    new Cuenta("X", -1);\n    check(false, "Debía lanzar IllegalArgumentException");\n} catch (IllegalArgumentException e) {\n}` },
      { id: 'transferir', name: 'Transferencia exitosa', body: `Cuenta a = new Cuenta("A", 100);\nCuenta b = new Cuenta("B", 0);\na.transferir(b, 40);\neqD(60, a.getSaldo());\neqD(40, b.getSaldo());` },
      { id: 'propaga', name: 'Transferencia fallida propaga y no deposita', body: `Cuenta a = new Cuenta("A", 10);\nCuenta b = new Cuenta("B", 0);\ntry {\n    a.transferir(b, 40);\n    check(false, "Debía propagar");\n} catch (SaldoInsuficienteException e) {\n    eqD(0, b.getSaldo());\n}` },
    ],
    referenceSolution: [
      { name: 'SaldoInsuficienteException.java', content: `public class SaldoInsuficienteException extends Exception {\n    public SaldoInsuficienteException(String mensaje) {\n        super(mensaje);\n    }\n}\n` },
      { name: 'Cuenta.java', content: `public class Cuenta {\n    private final String titular;\n    private double saldo;\n\n    public Cuenta(String titular, double saldoInicial) {\n        if (saldoInicial < 0) {\n            throw new IllegalArgumentException("Saldo inicial negativo");\n        }\n        this.titular = titular;\n        this.saldo = saldoInicial;\n    }\n\n    public String getTitular() {\n        return titular;\n    }\n\n    public double getSaldo() {\n        return saldo;\n    }\n\n    public void depositar(double monto) {\n        saldo += monto;\n    }\n\n    public void extraer(double monto) throws SaldoInsuficienteException {\n        if (monto > saldo) {\n            throw new SaldoInsuficienteException("Saldo insuficiente para extraer " + monto);\n        }\n        saldo -= monto;\n    }\n\n    public void transferir(Cuenta destino, double monto) throws SaldoInsuficienteException {\n        extraer(monto);\n        destino.depositar(monto);\n    }\n}\n` },
    ],
    hints: [
      { level: 1, text: 'Checked = extiende Exception (no RuntimeException); obliga a capturar o declarar.' },
      { level: 2, text: 'Validá antes de modificar el estado, así un error no deja la cuenta inconsistente.' },
      { level: 3, text: 'transferir: primero extraer(monto) — si lanza, nunca se llega a depositar.' },
    ],
    explanation: 'Las excepciones checked modelan situaciones de dominio esperables que el cliente debe manejar. Las unchecked (IllegalArgumentException) señalan usos incorrectos. Propagar con throws deja la decisión a quien tiene contexto para manejarla.',
  },
  // ------------------------------------------------------------------
  {
    ...base,
    id: 'aliasing-equipo',
    title: 'Detectar y evitar aliasing',
    domain: 'Equipos y jugadores',
    statement:
      'La clase **Equipo** recibe una lista de nombres de jugadores en el constructor y la expone con `getJugadores()`.\n\nEl código actual tiene **aliasing**: el cliente puede modificar el equipo desde afuera de dos maneras. Corregilo para que el equipo sólo cambie a través de `agregar`.',
    concepts: ['referencias', 'encapsulamiento', 'exposicion'],
    difficulty: 'introductory',
    format: 'debugging',
    starterCode: [
      { name: 'Equipo.java', content: `import java.util.*;\n\npublic class Equipo {\n    private final List<String> jugadores;\n\n    public Equipo(List<String> jugadores) {\n        this.jugadores = jugadores;\n    }\n\n    public void agregar(String jugador) {\n        jugadores.add(jugador);\n    }\n\n    public List<String> getJugadores() {\n        return jugadores;\n    }\n}\n` },
    ],
    requirements: [{ id: 'copia-get', description: 'getJugadores no devuelve la lista interna', check: { pattern: 'return\\s+(this\\.)?jugadores\\s*;', mustMatch: false } }],
    visibleTests: [{ id: 'get', name: 'Modificar lo devuelto no altera el equipo', body: `Equipo e = new Equipo(new ArrayList<>(List.of("A", "B")));\ntry { e.getJugadores().clear(); } catch (UnsupportedOperationException ex) { }\neq(2, e.getJugadores().size());` }],
    hiddenTests: [
      { id: 'ctor', name: 'Modificar la lista original no altera el equipo', body: `List<String> l = new ArrayList<>(List.of("A"));\nEquipo e = new Equipo(l);\nl.add("Intruso");\neq(1, e.getJugadores().size());` },
      { id: 'agregar', name: 'agregar sigue funcionando', body: `Equipo e = new Equipo(new ArrayList<>(List.of("A")));\ne.agregar("B");\neq(List.of("A", "B"), e.getJugadores());` },
      { id: 'inmutable', name: 'Funciona aunque reciba una lista inmutable', body: `Equipo e = new Equipo(List.of("A"));\ne.agregar("B");\neq(2, e.getJugadores().size());` },
    ],
    referenceSolution: [
      { name: 'Equipo.java', content: `import java.util.*;\n\npublic class Equipo {\n    private final List<String> jugadores;\n\n    public Equipo(List<String> jugadores) {\n        this.jugadores = new ArrayList<>(jugadores);\n    }\n\n    public void agregar(String jugador) {\n        jugadores.add(jugador);\n    }\n\n    public List<String> getJugadores() {\n        return Collections.unmodifiableList(jugadores);\n    }\n}\n` },
    ],
    hints: [
      { level: 1, text: 'Hay un alias al recibir la lista y otro al devolverla.' },
      { level: 2, text: 'En el constructor, hacé una copia defensiva: new ArrayList<>(jugadores).' },
      { level: 3, text: 'En el getter, devolvé una copia o Collections.unmodifiableList(...).' },
    ],
    explanation: 'Aliasing: dos referencias al mismo objeto mutable. Las copias defensivas al recibir y al devolver protegen el estado interno.',
  },
  // ------------------------------------------------------------------
  {
    ...base,
    id: 'observer-subasta',
    title: 'Observer: subasta con postores',
    domain: 'Coleccionables',
    statement:
      'Una **Subasta** permite `suscribir(ObservadorSubasta o)` y `ofertar(String postor, int monto)`.\n\nCada oferta **mayor** a la actual se registra y se notifica a todos los observadores llamando `nuevaOferta(postor, monto)`. Ofertas menores o iguales se ignoran (no se notifican).\n\nImplementá Subasta y un observador **RegistroOfertas** que guarda los textos "postor:monto" recibidos (`getRegistro()`).',
    concepts: ['observer', 'interfaces'],
    difficulty: 'intermediate',
    format: 'code-fragment',
    supportFiles: [{ name: 'ObservadorSubasta.java', readonly: true, content: `public interface ObservadorSubasta {\n    void nuevaOferta(String postor, int monto);\n}\n` }],
    starterCode: [
      { name: 'Subasta.java', content: `import java.util.*;\n\npublic class Subasta {\n    // Completá: suscribir, ofertar, getMejorOferta\n}\n` },
      { name: 'RegistroOfertas.java', content: `import java.util.*;\n\npublic class RegistroOfertas implements ObservadorSubasta {\n    // Completá\n}\n` },
    ],
    requirements: [{ id: 'lista-obs', description: 'Subasta guarda List<ObservadorSubasta>', check: { file: 'Subasta.java', pattern: 'List\\s*<\\s*ObservadorSubasta\\s*>', mustMatch: true } }],
    visibleTests: [{ id: 'notifica', name: 'Notifica una oferta', body: `Subasta s = new Subasta();\nRegistroOfertas r = new RegistroOfertas();\ns.suscribir(r);\ns.ofertar("Ana", 100);\neq(List.of("Ana:100"), r.getRegistro());` }],
    hiddenTests: [
      { id: 'ignora', name: 'Ignora ofertas menores', body: `Subasta s = new Subasta();\nRegistroOfertas r = new RegistroOfertas();\ns.suscribir(r);\ns.ofertar("Ana", 100);\ns.ofertar("Beto", 90);\ns.ofertar("Caro", 100);\neq(1, r.getRegistro().size());\neq(100, s.getMejorOferta());` },
      { id: 'varios', name: 'Notifica a todos los observadores', body: `Subasta s = new Subasta();\nRegistroOfertas r1 = new RegistroOfertas();\nRegistroOfertas r2 = new RegistroOfertas();\ns.suscribir(r1);\ns.suscribir(r2);\ns.ofertar("Ana", 5);\neq(1, r1.getRegistro().size());\neq(1, r2.getRegistro().size());` },
    ],
    referenceSolution: [
      { name: 'Subasta.java', content: `import java.util.*;\n\npublic class Subasta {\n    private final List<ObservadorSubasta> observadores = new ArrayList<>();\n    private int mejorOferta = 0;\n\n    public void suscribir(ObservadorSubasta o) {\n        observadores.add(o);\n    }\n\n    public int getMejorOferta() {\n        return mejorOferta;\n    }\n\n    public void ofertar(String postor, int monto) {\n        if (monto <= mejorOferta) {\n            return;\n        }\n        mejorOferta = monto;\n        for (ObservadorSubasta o : observadores) {\n            o.nuevaOferta(postor, monto);\n        }\n    }\n}\n` },
      { name: 'RegistroOfertas.java', content: `import java.util.*;\n\npublic class RegistroOfertas implements ObservadorSubasta {\n    private final List<String> registro = new ArrayList<>();\n\n    @Override\n    public void nuevaOferta(String postor, int monto) {\n        registro.add(postor + ":" + monto);\n    }\n\n    public List<String> getRegistro() {\n        return new ArrayList<>(registro);\n    }\n}\n` },
    ],
    hints: [
      { level: 1, text: 'El sujeto (Subasta) guarda una lista de observadores, no sabe qué hacen.' },
      { level: 2, text: 'Al aceptar una oferta, recorré la lista llamando nuevaOferta.' },
      { level: 3, text: 'Si monto <= mejorOferta, salí antes de notificar.' },
    ],
    explanation: 'Observer desacopla al sujeto de quienes reaccionan a sus cambios: se pueden agregar observadores nuevos sin modificar Subasta.',
  },
  // ------------------------------------------------------------------
  {
    ...base,
    id: 'iterator-rango',
    title: 'Iterator: recorrer un rango',
    domain: 'Colecciones',
    statement:
      'Implementá **Rango** (desde, hasta, inclusive ambos) que implemente `Iterable<Integer>` para poder usarlo en un for-each:\n\n```java\nfor (int x : new Rango(3, 6)) ... // 3, 4, 5, 6\n```\n\nNo guardes todos los números en una lista: el iterador debe generarlos.',
    concepts: ['iterator', 'interfaces'],
    difficulty: 'advanced',
    format: 'code-fragment',
    starterCode: [{ name: 'Rango.java', content: `import java.util.*;\n\npublic class Rango implements Iterable<Integer> {\n    // Completá\n}\n` }],
    requirements: [
      { id: 'sin-lista', description: 'No guardar los números en una lista', check: { pattern: 'List\\s*<\\s*Integer\\s*>', mustMatch: false } },
      { id: 'iterator', description: 'Devuelve un Iterator<Integer>', check: { pattern: 'Iterator\\s*<\\s*Integer\\s*>', mustMatch: true } },
    ],
    visibleTests: [{ id: 'foreach', name: 'for-each de 3 a 6', body: `List<Integer> l = new ArrayList<>();\nfor (int x : new Rango(3, 6)) l.add(x);\neq(List.of(3, 4, 5, 6), l);` }],
    hiddenTests: [
      { id: 'vacio', name: 'Rango vacío', body: `eq(false, new Rango(5, 4).iterator().hasNext());` },
      { id: 'independientes', name: 'Iteradores independientes', body: `Rango r = new Rango(1, 2);\nIterator<Integer> a = r.iterator();\na.next();\neq(1, r.iterator().next());` },
      { id: 'nosuch', name: 'next() al final lanza NoSuchElementException', body: `Iterator<Integer> it = new Rango(1, 1).iterator();\nit.next();\ntry {\n    it.next();\n    check(false, "Debía lanzar NoSuchElementException");\n} catch (NoSuchElementException e) {\n}` },
    ],
    referenceSolution: [
      { name: 'Rango.java', content: `import java.util.*;\n\npublic class Rango implements Iterable<Integer> {\n    private final int desde;\n    private final int hasta;\n\n    public Rango(int desde, int hasta) {\n        this.desde = desde;\n        this.hasta = hasta;\n    }\n\n    @Override\n    public Iterator<Integer> iterator() {\n        return new Iterator<Integer>() {\n            private int actual = desde;\n\n            @Override\n            public boolean hasNext() {\n                return actual <= hasta;\n            }\n\n            @Override\n            public Integer next() {\n                if (!hasNext()) {\n                    throw new NoSuchElementException();\n                }\n                return actual++;\n            }\n        };\n    }\n}\n` },
    ],
    hints: [
      { level: 1, text: 'iterator() debe devolver un objeto nuevo cada vez, con su propio "actual".' },
      { level: 2, text: 'Podés usar una clase anónima o interna que implemente Iterator<Integer>.' },
      { level: 3, text: 'hasNext: actual <= hasta. next: devolver actual y avanzar.' },
    ],
    explanation: 'Iterator separa el recorrido de la colección. Cada llamada a iterator() crea un cursor independiente; el for-each funciona con cualquier Iterable.',
  },
]
