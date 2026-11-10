import { Link } from 'react-router-dom'
import { Page } from '../components/ui'

export function NotFound() {
  return (
    <Page title="Página no encontrada">
      <Link to="/" className="btn">Volver al inicio</Link>
    </Page>
  )
}
