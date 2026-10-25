import { Component } from 'react'
import { TriangleAlert } from 'lucide-react'

/* Keeps a render error in one page from blanking the whole app; `resetKey`
 * (the route) clears it when the user navigates elsewhere. */
export default class ErrorBoundary extends Component {
  state = { error: null, key: this.props.resetKey }

  static getDerivedStateFromError(error) {
    return { error }
  }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="card empty" role="alert">
        <TriangleAlert size={36} />
        <b>Algo deu errado ao exibir esta página.</b>
        <button type="button" className="btn" style={{ marginTop: 12 }} onClick={() => this.setState({ error: null })}>Tentar de novo</button>
      </div>
    )
  }
}
