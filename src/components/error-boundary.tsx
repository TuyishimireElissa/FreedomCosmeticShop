"use client"

/**
 * ErrorBoundary — catches client-side rendering errors and shows a fallback UI.
 *
 * Usage:
 *   <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 * In production, the fallback shows the actual error message + stack trace
 * (collapsed by default) so users can report it.
 */

import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error("ErrorBoundary caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const error = this.state.error
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-red-100">
                <svg
                  className="h-5 w-5 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold">Something went wrong</h1>
                <p className="text-sm text-muted-foreground">
                  An error occurred while rendering this page.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-900">
                  {error.name}: {error.message}
                </p>
                {error.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-red-700 hover:underline">
                    Show stack trace
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-red-100 p-2 text-[10px] text-red-800">
                    {error.stack}
                  </pre>
                </details>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined })
                }}
                className="flex-1 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
              >
                Try again
              </button>
              <button
                onClick={() => {
                  window.location.href = "/"
                }}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Go to homepage
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
