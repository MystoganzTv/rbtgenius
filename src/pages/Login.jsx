import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { GraduationCap, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { translateUi } from "@/lib/i18n";
import { createPageUrl } from "@/utils";

function normalizeRedirectPath(value) {
  if (!value) {
    return createPageUrl("Dashboard");
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}${url.hash}` || createPageUrl("Dashboard");
  } catch {
    return createPageUrl("Dashboard");
  }
}

function getRedirectPath(search) {
  const params = new URLSearchParams(search);
  return normalizeRedirectPath(params.get("redirectTo"));
}

export default function Login() {
  const location = useLocation();
  const { language } = useLanguage();
  const {
    user,
    isAuthenticated,
    isLoadingAuth,
    authError,
    login,
  } = useAuth();
  const redirectPath = useMemo(() => getRedirectPath(location.search), [location.search]);
  const googleAuthUrl = useMemo(
    () => api.getOAuthStartUrl("google", redirectPath),
    [redirectPath],
  );
  const initialMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("mode") === "register" ? "register" : "login";
  }, [location.search]);
  const t = (value) => translateUi(value, language);

  const [activeTab, setActiveTab] = useState(initialMode);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setActiveTab(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (authError?.message) {
      setErrorMessage(t(authError.message));
    }
  }, [authError, t]);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && user && typeof window !== "undefined") {
      window.location.replace(redirectPath);
    }
  }, [isAuthenticated, isLoadingAuth, redirectPath, user]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const authData = await api.login(loginForm);
      await login(authData);
      window.location.replace(redirectPath);
    } catch (error) {
      setErrorMessage(t(error.message || "Unable to sign in"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const authData = await api.register(registerForm);
      await login(authData);
      window.location.replace(redirectPath);
    } catch (error) {
      setErrorMessage(t(error.message || "Unable to create account"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6 dark:bg-[#0B1628]">
      <Card className="w-full max-w-md rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1E5EFF]">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <div className="flex items-center justify-center gap-1">
            <span className="text-xl font-bold text-slate-900 dark:text-slate-50">
              RBT
            </span>
            <span className="text-xl font-bold text-[#1E5EFF]">Genius</span>
            <Sparkles className="-mt-1 h-4 w-4 text-[#FFB800]" />
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {t("Use your email and password to continue.")}
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <p className="text-center text-xs font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
            {t("Quick sign in")}
          </p>
          <a
            href={googleAuthUrl}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-[#1E5EFF]/12 dark:bg-[#0D1E3A] dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 11.6S6.9 20.8 12 20.8c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.9-.1-1.3H12Z"
              />
              <path
                fill="#34A853"
                d="M2.8 7.2l3.2 2.3c.9-1.7 2.7-2.9 5-2.9 1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4c-3.6 0-6.7 2-8.3 4.8Z"
              />
              <path
                fill="#FBBC05"
                d="M12 20.8c2.6 0 4.8-.9 6.4-2.5l-3-2.5c-.8.6-1.9 1-3.4 1-3.8 0-5.1-2.5-5.4-3.8l-3.2 2.5c1.6 3 4.7 5.3 8.6 5.3Z"
              />
              <path
                fill="#4285F4"
                d="M21.1 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.4c-.2 1.1-.9 2-1.8 2.7l3 2.5c1.8-1.7 2.5-4.1 2.5-7.5Z"
              />
            </svg>
            <span>{t("Continue with Google")}</span>
          </a>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
              {t("Or use email")}
            </span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{t("Login")}</TabsTrigger>
            <TabsTrigger value="register">{t("Register")}</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                {t("Manual login")}
              </p>
              <Input
                type="email"
                autoComplete="email"
                placeholder={t("Email")}
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
              <Input
                type="password"
                autoComplete="current-password"
                placeholder={t("Password")}
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#1E5EFF] hover:bg-[#1E5EFF]/90"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Sign In")}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                {t("Manual registration")}
              </p>
              <Input
                autoComplete="name"
                placeholder={t("Full name")}
                value={registerForm.full_name}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    full_name: event.target.value,
                  }))
                }
              />
              <Input
                type="email"
                autoComplete="email"
                placeholder={t("Email")}
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={t("Password (min 8 chars)")}
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#1E5EFF] hover:bg-[#1E5EFF]/90"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("Create Account")
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <Button
          asChild
          variant="ghost"
          className="mt-4 w-full rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
        >
          <Link to="/">back to landing</Link>
        </Button>
      </Card>
    </div>
  );
}
