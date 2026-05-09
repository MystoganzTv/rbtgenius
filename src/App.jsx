import { QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import UserNotRegisteredError from "@/components/UserNotRegisteredError.jsx";
import { Toaster } from "@/components/ui/toaster";
import AppErrorBoundary from "@/components/AppErrorBoundary.jsx";
import { ThemeProvider } from "@/hooks/use-theme";
import { LanguageProvider } from "@/hooks/use-language";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import PageNotFound from "@/lib/PageNotFound";
import { queryClientInstance } from "@/lib/query-client";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import { pageNameToSlug } from "@/utils";
import { pagesConfig } from "./pages.config";

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : null;
const PAGE_SLUGS = Object.fromEntries(
  Object.keys(Pages).map((pageName) => [pageNameToSlug(pageName), pageName]),
);
const PUBLIC_PAGES = new Set([
  "Pricing",
  "TermsOfService",
  "PrivacyPolicy",
  "RefundPolicy",
  "Contact",
]);

function LayoutWrapper({ children, currentPageName }) {
  if (!Layout) {
    return <>{children}</>;
  }

  return <Layout currentPageName={currentPageName}>{children}</Layout>;
}

function resolvePageComponent(pageName) {
  return Pages[pageName] || null;
}

function resolvePageKey(candidate) {
  if (!candidate) {
    return null;
  }

  if (Pages[candidate]) {
    return candidate;
  }

  return PAGE_SLUGS[String(candidate).toLowerCase()] || null;
}

function PageRenderer({ pageKey }) {
  const resolvedPageKey = resolvePageKey(pageKey) || mainPageKey;
  const PageComponent = resolvePageComponent(resolvedPageKey) || MainPage;

  if (!PageComponent) {
    return <PageNotFound />;
  }

  if (PUBLIC_PAGES.has(resolvedPageKey)) {
    return <PageComponent />;
  }

  return (
    <LayoutWrapper currentPageName={resolvedPageKey}>
      <PageComponent />
    </LayoutWrapper>
  );
}

function QueryPageRedirect() {
  const location = useLocation();
  const requestedPage = new URLSearchParams(location.search).get("page");
  const pageKey = resolvePageKey(requestedPage);

  if (!pageKey) {
    return <Landing />;
  }

  const destination = `/${pageNameToSlug(pageKey)}`;
  return <Navigate to={destination} replace />;
}

function RootRoute() {
  const location = useLocation();
  const requestedPage = new URLSearchParams(location.search).get("page");

  if (!requestedPage) {
    return <Landing />;
  }

  return <QueryPageRedirect key={location.search} />;
}

function RoutedPage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const { pageName } = useParams();
  const resolvedPageKey = resolvePageKey(pageName);

  if (!resolvedPageKey) {
    return <PageNotFound />;
  }

  if (!isAuthenticated && PUBLIC_PAGES.has(resolvedPageKey)) {
    return <PageRenderer pageKey={resolvedPageKey} />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?redirectTo=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`}
        replace
      />
    );
  }

  const canonicalPath = `/${pageNameToSlug(resolvedPageKey)}`;

  if (location.pathname !== canonicalPath) {
    return <Navigate to={canonicalPath} replace />;
  }

  return <PageRenderer pageKey={resolvedPageKey} />;
}

function AuthenticatedApp() {
  const {
    isLoadingAuth,
    authError,
    isAuthenticated,
  } = useAuth();
  const location = useLocation();
  const requestedPage = resolvePageKey(new URLSearchParams(location.search).get("page"));
  const legacyPageName = resolvePageKey(
    location.pathname.startsWith("/") ? location.pathname.slice(1) : location.pathname,
  );
  const isLoginRoute = location.pathname === "/login";
  const isLandingRoute = location.pathname === "/" && !new URLSearchParams(location.search).get("page");
  const isPublicRoute =
    (location.pathname === "/" && PUBLIC_PAGES.has(requestedPage)) ||
    PUBLIC_PAGES.has(legacyPageName);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800 dark:border-[#1E5EFF]/15 dark:border-t-slate-200" />
      </div>
    );
  }

  if (authError?.type === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  if (!isAuthenticated && !isLoginRoute && !isLandingRoute && !isPublicRoute) {
    return (
      <Navigate
        to={`/login?redirectTo=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`}
        replace
      />
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RootRoute />} />
      <Route path="/:pageName" element={<RoutedPage />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <AppErrorBoundary>
              <Router>
                <AuthenticatedApp />
              </Router>
            </AppErrorBoundary>
            <Toaster />
          </QueryClientProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
