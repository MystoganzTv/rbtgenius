import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function PageNotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const pageName = useMemo(() => {
    const pathname = location.pathname.replace(/^\/+/, "");
    return pathname || "home";
  }, [location.pathname]);

  const isAdmin = isAuthenticated && user?.role === "admin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-7xl font-light text-slate-300">404</h1>
            <div className="mx-auto h-0.5 w-16 bg-slate-200" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-medium text-slate-800">
              Page Not Found
            </h2>
            <p className="leading-relaxed text-slate-600">
              The page{" "}
              <span className="font-medium text-slate-700">"{pageName}"</span>{" "}
              could not be found in this application.
            </p>
          </div>

          {isAdmin ? (
            <div className="mt-8 rounded-lg border border-slate-200 bg-slate-100 p-4">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-orange-100">
                  <div className="h-2 w-2 rounded-full bg-orange-400" />
                </div>
                <div className="space-y-1 text-left">
                  <p className="text-sm font-medium text-slate-700">
                    Admin Note
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600">
                    This could mean that the page has not been implemented yet.
                    You can add it to the project from the chat when you are
                    ready.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="pt-6">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
