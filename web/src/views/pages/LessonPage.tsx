import { Link, useParams } from 'react-router-dom'
import { animationById } from '../../data/animations'
import { UNITS } from '../../data/concepts'
import { getExercise } from '../../controllers/exercise/catalog'
import { LESSONS, lessonById } from '../../data/lessons'
import { ConceptChips, Page } from '../components/ui'
import { NotFound } from './NotFound'

export function LessonPage() {
  const { id } = useParams()
  const lesson = lessonById(id ?? '')
  if (!lesson) return <NotFound />
  const idx = LESSONS.indexOf(lesson)
  const unit = UNITS.find((u) => u.id === lesson.unit)!
  return (
    <Page title={lesson.title} subtitle={<>Unidad {UNITS.indexOf(unit) + 1}: {unit.title}</>}>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <article className="card p-5 sm:p-7 min-w-0">
          <ConceptChips ids={lesson.concepts} max={8} />
          <div className="prose-lab mt-4 space-y-3">
            {lesson.blocks.map((b, i) => {
              switch (b.type) {
                case 'p': return <p key={i}>{b.text}</p>
                case 'h': return <h2 key={i} className="text-lg font-semibold pt-2">{b.text}</h2>
                case 'list': return <ul key={i}>{b.items.map((x, j) => <li key={j}>{x}</li>)}</ul>
                case 'code': return <figure key={i}>{b.caption && <figcaption className="text-xs muted mb-1">{b.caption}</figcaption>}<pre className="codeblock">{b.code}</pre></figure>
                case 'tip': return <p key={i} className="rounded-lg p-3 text-sm" style={{ background: 'var(--ok-soft)' }}><strong>Tip: </strong>{b.text}</p>
                case 'warn': return <p key={i} className="rounded-lg p-3 text-sm" style={{ background: 'var(--warn-soft)' }}><strong>Atención: </strong>{b.text}</p>
              }
            })}
          </div>
          <div className="flex justify-between mt-8 gap-2">
            {idx > 0 ? <Link className="btn" to={`/leccion/${LESSONS[idx - 1].id}`}>← {LESSONS[idx - 1].title}</Link> : <span />}
            {idx < LESSONS.length - 1 && <Link className="btn" to={`/leccion/${LESSONS[idx + 1].id}`}>{LESSONS[idx + 1].title} →</Link>}
          </div>
        </article>
        <aside className="space-y-4">
          {lesson.quizId && <Link to={`/quiz/${lesson.quizId}`} className="btn btn-primary w-full justify-center">Hacer el quiz</Link>}
          {!!lesson.animationIds?.length && (
            <div className="card p-4">
              <h2 className="font-medium text-sm mb-2">Animaciones</h2>
              <ul className="space-y-1 text-sm">{lesson.animationIds.map((a) => <li key={a}><Link className="underline" to={`/animaciones/${a}`}>{animationById(a)?.title}</Link></li>)}</ul>
            </div>
          )}
          {!!lesson.exerciseIds?.length && (
            <div className="card p-4">
              <h2 className="font-medium text-sm mb-2">Practicar</h2>
              <ul className="space-y-1 text-sm">{lesson.exerciseIds.map((e) => <li key={e}><Link className="underline" to={`/ejercicio/${e}`}>{getExercise(e)?.title}</Link></li>)}</ul>
            </div>
          )}
          <p className="text-xs muted">Resumen elaborado a partir del programa de la materia y la documentación oficial de Java (docs.oracle.com). Convenciones específicas de la cátedra deben confirmarse con el material oficial.</p>
        </aside>
      </div>
    </Page>
  )
}
