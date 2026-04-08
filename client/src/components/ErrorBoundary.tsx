import { Component, type ReactNode } from "react"

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary] Chart crashed:", error)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div style={{ minHeight: "140px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #FECACA", borderRadius: "12px", background: "#FEF2F2", color: "#B91C1C", fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Chart failed to load</p>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{ marginTop: "8px", border: "none", background: "transparent", color: "#DC2626", textDecoration: "underline", cursor: "pointer", fontSize: "12px" }}
              >
                Retry
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}