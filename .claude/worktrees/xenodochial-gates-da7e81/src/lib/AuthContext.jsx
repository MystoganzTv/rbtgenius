import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { appParams } from "@/lib/app-params";

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = "rbt_genius_auth_token";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function getQueryParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

function writeToken(token) {
  const storage = getStorage();

  if (!storage || !token) {
    return;
  }

  storage.setItem(AUTH_STORAGE_KEY, token);
  storage.setItem("access_token", token);
  storage.setItem("token", token);
}

function clearStoredToken() {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(AUTH_STORAGE_KEY);
  storage.removeItem("access_token");
  storage.removeItem("token");
}

function readStoredToken() {
  const storage = getStorage();

  if (appParams.token) {
    writeToken(appParams.token);
    return appParams.token;
  }

  if (!storage) {
    return null;
  }

  return (
    storage.getItem(AUTH_STORAGE_KEY) ||
    storage.getItem("access_token") ||
    storage.getItem("token")
  );
}

async function requestJson(url, options = {}, fetchImpl = fetch) {
  const { token, headers = {}, ...restOptions } = options;

  const response = await fetchImpl(url, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(
      (typeof data === "object" && data?.message) ||
        response.statusText ||
        "Request failed",
    );

    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function normalizeAuthError(error) {
  if (error?.status === 403 && error?.data?.extra_data?.reason === "user_not_registered") {
    return {
      type: "user_not_registered",
      message: "User not registered for this app",
    };
  }

  if (error?.status === 401 || error?.status === 403) {
    return {
      type: "auth_required",
      message: "Authentication required",
    };
  }

  return {
    type: "unknown",
    message: error?.message || "An unexpected error occurred",
  };
}

function stripAuthParamsFromUrl() {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const hadAuthParams = params.has("authToken") || params.has("oauthError");

  if (!hadAuthParams) {
    return;
  }

  params.delete("authToken");
  params.delete("oauthError");

  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
  window.history.replaceState({}, document.title, nextUrl);
}

export function AuthProvider({
  children,
  endpoints = {},
  loginPath = "/login",
  fetchImpl = fetch,
}) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const resolvedEndpoints = useMemo(
    () => ({
      me: endpoints.me || "/api/auth/me",
      publicSettings: endpoints.publicSettings || "/api/public-settings",
      logout: endpoints.logout || "/api/auth/logout",
    }),
    [endpoints.logout, endpoints.me, endpoints.publicSettings],
  );

  const applyAuth = useCallback((authData = {}) => {
    const nextUser =
      authData && typeof authData === "object" && "user" in authData
        ? authData.user
        : authData;
    const nextToken =
      authData && typeof authData === "object" && "token" in authData
        ? authData.token
        : null;

    if (nextToken) {
      writeToken(nextToken);
    }

    setUser(nextUser || null);
    setIsAuthenticated(Boolean(nextUser || nextToken));
    setAuthError(null);
  }, []);

  const loadCurrentUser = useCallback(
    async (token) => {
      if (!token) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
        return null;
      }

      const meResponse = await requestJson(
        resolvedEndpoints.me,
        { token },
        fetchImpl,
      );

      // The /auth/me endpoint returns the user fields directly. If the server
      // performed a sliding rotation, it also includes `token` and `expires_at`
      // alongside the user fields — strip them out before storing the user.
      const { token: rotatedToken, expires_at: _expiresAt, ...currentUser } =
        meResponse || {};
      const effectiveToken = rotatedToken || token;

      writeToken(effectiveToken);
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      return currentUser;
    },
    [fetchImpl, resolvedEndpoints.me],
  );

  const bootstrapAuth = useCallback(async () => {
    const params = getQueryParams();
    const urlToken = params.get("authToken");
    const oauthError = params.get("oauthError");
    const token = urlToken || readStoredToken();

    try {
      setIsLoadingAuth(true);
      setAuthError(
        oauthError
          ? {
              type: "oauth_error",
              message: oauthError,
            }
          : null,
      );

      if (resolvedEndpoints.publicSettings) {
        const publicSettings = await requestJson(
          resolvedEndpoints.publicSettings,
          {
            headers: appParams.appId ? { "X-App-Id": appParams.appId } : {},
          },
          fetchImpl,
        );

        setAppPublicSettings(publicSettings);
      }

      if (!token) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      await loadCurrentUser(token);
      stripAuthParamsFromUrl();
    } catch (error) {
      clearStoredToken();
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(normalizeAuthError(error));
    } finally {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
    }
  }, [fetchImpl, loadCurrentUser, resolvedEndpoints.publicSettings]);

  useEffect(() => {
    bootstrapAuth();
  }, [bootstrapAuth]);

  const login = useCallback(
    async (authData = {}) => {
      applyAuth(authData);
      return authData;
    },
    [applyAuth],
  );

  const logout = useCallback(
    async (shouldRedirect = true) => {
      const token = readStoredToken();

      if (token) {
        try {
          await requestJson(
            resolvedEndpoints.logout,
            {
              method: "POST",
              token,
            },
            fetchImpl,
          );
        } catch {
          // Ignore logout network issues and continue local cleanup.
        }
      }

      clearStoredToken();
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);

      if (shouldRedirect && typeof window !== "undefined") {
        window.location.assign(loginPath);
      }
    },
    [fetchImpl, loginPath, resolvedEndpoints.logout],
  );

  const navigateToLogin = useCallback(
    (redirectTo) => {
      if (typeof window === "undefined") {
        return;
      }

      const url = new URL(loginPath, window.location.origin);
      url.searchParams.set("redirectTo", redirectTo || window.location.pathname);
      window.location.assign(url.toString());
    },
    [loginPath],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      login,
      logout,
      navigateToLogin,
      checkAppState: bootstrapAuth,
      checkUserAuth: loadCurrentUser,
    }),
    [
      appPublicSettings,
      authError,
      bootstrapAuth,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      loadCurrentUser,
      login,
      logout,
      navigateToLogin,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export { AuthContext };
