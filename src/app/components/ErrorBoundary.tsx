import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
  fallbackText?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="rounded-full bg-red-100 p-4 mb-4 dark:bg-red-900/20">
            <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">Something went wrong</h2>
          <p className="mb-6 max-w-md text-sm text-muted-foreground">
            {this.props.fallbackText || 
              "An unexpected error occurred in this module. The application caught it before it could crash."}
          </p>
          <div className="mb-6 max-w-lg rounded-md bg-muted p-4 text-left text-xs overflow-auto">
            <code className="text-red-500 whitespace-pre-wrap break-words">
              {this.state.error?.message || "Unknown error"}
            </code>
          </div>
          <div className="flex gap-4">
            <Button onClick={() => window.history.back()} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Button onClick={this.handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reset & Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
