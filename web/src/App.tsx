import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppServicesProvider } from './services/AppServices'
import { Layout } from './views/layout/Layout'
import { Dashboard } from './views/pages/Dashboard'
import { Modules } from './views/pages/Modules'
import { LessonPage } from './views/pages/LessonPage'
import { QuizPage } from './views/pages/QuizPage'
import { PracticePage } from './views/pages/PracticePage'
import { GeneratorPage } from './views/pages/GeneratorPage'
import { ProgressPage } from './views/pages/ProgressPage'
import { AnimationsPage, AnimationPage } from './views/pages/AnimationsPage'
import { NotFound } from './views/pages/NotFound'

// El editor (Monaco) es pesado: se carga sólo al abrir un ejercicio o el analizador.
const ExercisePage = lazy(() => import('./views/pages/ExercisePage'))
const AnalyzerPage = lazy(() => import('./views/pages/AnalyzerPage'))

const Loading = () => <div className="p-8 muted" role="status">Cargando editor…</div>

export default function App() {
  return (
    <AppServicesProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="modulos" element={<Modules />} />
            <Route path="leccion/:id" element={<LessonPage />} />
            <Route path="quiz/:id" element={<QuizPage />} />
            <Route path="practicar" element={<PracticePage />} />
            <Route path="generador" element={<GeneratorPage key="gen" />} />
            <Route path="examen" element={<GeneratorPage key="exam" examOnly />} />
            <Route path="ejercicio/:id" element={<Suspense fallback={<Loading />}><ExercisePage /></Suspense>} />
            <Route path="analizador" element={<Suspense fallback={<Loading />}><AnalyzerPage /></Suspense>} />
            <Route path="animaciones" element={<AnimationsPage />} />
            <Route path="animaciones/:id" element={<AnimationPage />} />
            <Route path="progreso" element={<ProgressPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppServicesProvider>
  )
}
