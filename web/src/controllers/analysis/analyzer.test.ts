import { describe, expect, it } from 'vitest'
import { analyzeJava } from './analyzer'

const ids = (name: string, content: string) => analyzeJava([{ name, content }]).diagnostics.map((d) => d.ruleId)

describe('analyzeJava', () => {
  it('detecta String con == y resta en Comparator', () => {
    const src = `import java.util.*;
public class Comp implements Comparator<Pitufo> {
    @Override
    public int compare(Pitufo p1, Pitufo p2) {
        if (p1.getNombre() == p2.getNombre()) return 0;
        return p1.getExperiencia() - p2.getExperiencia();
    }
}`
    const support = `public class Pitufo { private final String nombre; private final int experiencia;
  public Pitufo(String n, int e) { nombre = n; experiencia = e; }
  public String getNombre() { return nombre; } public int getExperiencia() { return experiencia; } }`
    const r = analyzeJava([{ name: 'Comp.java', content: src }, { name: 'Pitufo.java', content: support }], { reportFiles: ['Comp.java'] })
    const found = r.diagnostics.map((d) => d.ruleId)
    expect(found).toContain('string-eq')
    expect(found).toContain('comparator-subtraction')
    expect(r.diagnostics.find((d) => d.ruleId === 'string-eq')!.line).toBe(5)
  })

  it('no marca un Comparator correcto', () => {
    const found = ids('C.java', `import java.util.*;
public class C implements Comparator<Pitufo> {
    public int compare(Pitufo a, Pitufo b) {
        int r = Integer.compare(b.getExperiencia(), a.getExperiencia());
        if (r == 0) r = a.getNombre().compareTo(b.getNombre());
        return r;
    }
}`)
    expect(found).toEqual([])
  })

  it('detecta campos públicos, colección expuesta, ArrayList en API y equals sin hashCode', () => {
    const found = ids('Brigada.java', `import java.util.*;
public class Brigada {
    public String nombre;
    private ArrayList<Pitufo> pitufos = new ArrayList<>();
    public List<Pitufo> getPitufos() { return pitufos; }
    public boolean equals(Object o) { return o instanceof Brigada; }
}`)
    expect(found).toEqual(expect.arrayContaining(['public-field', 'exposed-collection', 'concrete-collection-type', 'equals-without-hashcode']))
  })

  it('detecta catch genérico vacío, instanceof y copia superficial', () => {
    const found = ids('Contenedor.java', `import java.util.*;
public class Contenedor extends Elemento {
    private final List<Elemento> hijos = new ArrayList<>();
    public double getPeso() {
        double t = 0;
        for (Elemento e : hijos) {
            if (e instanceof Compra) t += ((Compra) e).getPeso();
            else if (e instanceof Contenedor) t += ((Contenedor) e).getPeso();
        }
        try { Thread.sleep(1); } catch (Exception e) { }
        return t;
    }
    public Contenedor copia() {
        Contenedor c = new Contenedor();
        c.hijos.addAll(hijos);
        return c;
    }
}`)
    expect(found).toEqual(expect.arrayContaining(['instanceof-chain', 'generic-catch', 'empty-catch', 'shallow-copy', 'downcast']))
  })

  it('detecta código muerto, variable sin usar y compare sin 0', () => {
    const found = ids('X.java', `public class X implements java.util.Comparator<String> {
    public int compare(String a, String b) {
        if (a.length() > b.length()) return 1;
        return -1;
    }
    public int f() {
        int sinUso = 3;
        return 1;
        System.out.println("nunca");
    }
}`)
    expect(found).toEqual(expect.arrayContaining(['comparator-contract', 'dead-code', 'unused-variable', 'unclear-name']))
  })

  it('detecta llaves desbalanceadas y nombre de archivo', () => {
    expect(ids('A.java', 'public class B { void m() { }')).toEqual(expect.arrayContaining(['syntax-braces', 'syntax-class-name']))
  })
})
