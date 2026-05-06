import React from "react";

function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("rbt_genius_auth_token");
  window.localStorage.removeItem("access_token");
  window.localStorage.removeItem("token");
}

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Unexpected application error",
    };
  }

  componentDidCatch(error) {
    console.error("App render error:", error);
  }

  handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  handleResetSession = () => {
    clearStoredSession();

    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020817] px-6 py-12 text-white">
        <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)] backdrop-blur">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#8EB0FF]">
            RBT Genius
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight">
            Something went wrong while loading this page.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            We stopped the crash so the app does not stay on a blank screen. You can
            retry, or clear the current session and sign in again.
          </p>
          <div className="mt-3 rounded-2xl border border-amber-400/15 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {this.state.errorMessage}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#1E5EFF] px-5 text-sm font-semibold text-white transition hover:bg-[#1E5EFF]/90"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleResetSession}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/12 bg-white/5 px-5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Clear session and sign in
            </button>
          </div>
        </div>
      </div>
    );
  }
}
