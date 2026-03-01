import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Mail, Lock, ArrowRight, KeyRound, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoLogin from "@/assets/Logo-principal.svg";

type AuthMode = "login" | "forgot-password" | "reset-sent";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        console.log("[AdminLogin] Checking existing session...");
        const { data: { session } } = await supabase.auth.getSession();

        if (!session || !mounted) {
          console.log("[AdminLogin] No session found");
          return;
        }

        console.log("[AdminLogin] Session found, checking admin role...");
        const { data: roles, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("[AdminLogin] Error checking role:", error);
          return;
        }

        if (roles && mounted) {
          console.log("[AdminLogin] User is admin, redirecting...");
          navigate("/administrador");
        }
      } catch (error) {
        console.error("[AdminLogin] Auth check error:", error);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AdminLogin] Auth state changed:", event);

      if (event === "SIGNED_IN" && session && mounted) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (roles && mounted) {
          navigate("/administrador");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const getErrorMessage = (error: string): string => {
    const errorMap: Record<string, string> = {
      "Invalid login credentials": "Email ou senha incorretos. Verifique suas credenciais.",
      "Email not confirmed": "Seu email ainda não foi confirmado. Verifique sua caixa de entrada.",
      "Too many requests": "Muitas tentativas de login. Aguarde alguns minutos.",
      "User not found": "Usuário não encontrado.",
      "Invalid email": "Email inválido.",
    };

    return errorMap[error] || `Erro de autenticação: ${error}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      console.log("[Login] Attempting login for:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[Login] Auth error:", error);
        throw error;
      }

      console.log("[Login] Auth successful, user:", data.user.id);

      // Check if user is admin with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout ao verificar permissões")), 10000)
      );

      const rolesPromise = supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();

      const { data: roles, error: rolesError } = await Promise.race([
        rolesPromise,
        timeoutPromise
      ]) as any;

      console.log("[Login] Roles check result:", { roles, rolesError });

      if (rolesError) {
        console.error("[Login] Roles error:", rolesError);
        throw rolesError;
      }

      if (!roles) {
        console.log("[Login] User is not admin, signing out");
        await supabase.auth.signOut();
        setErrorMessage("Acesso negado. Você não possui permissões de administrador.");
        return;
      }

      console.log("[Login] Admin confirmed, redirecting...");
      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta ao painel administrativo.",
      });

      navigate("/administrador");
    } catch (error: any) {
      console.error("[Login] Error:", error);
      setErrorMessage(getErrorMessage(error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin?reset=true`,
      });

      if (error) throw error;

      setMode("reset-sent");
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    } catch (error: any) {
      setErrorMessage(getErrorMessage(error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="admin@empresa.com"
            className="pl-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="pl-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
      </div>

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
        >
          {errorMessage}
        </motion.div>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="mr-2 h-4 w-4" />
        )}
        Entrar
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode("forgot-password");
          setErrorMessage("");
        }}
        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <KeyRound className="inline-block h-3 w-3 mr-1" />
        Esqueci minha senha
      </button>
    </form>
  );

  const renderForgotPasswordForm = () => (
    <form onSubmit={handleForgotPassword} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-email">Email cadastrado</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reset-email"
            type="email"
            placeholder="admin@empresa.com"
            className="pl-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
      </div>

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
        >
          {errorMessage}
        </motion.div>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="mr-2 h-4 w-4" />
        )}
        Enviar link de recuperação
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode("login");
          setErrorMessage("");
        }}
        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="inline-block h-3 w-3 mr-1" />
        Voltar ao login
      </button>
    </form>
  );

  const renderResetSent = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Mail className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">Verifique seu email</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Enviamos um link de recuperação para <strong>{email}</strong>
        </p>
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setMode("login");
          setErrorMessage("");
        }}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar ao login
      </Button>
    </div>
  );

  const getTitle = () => {
    switch (mode) {
      case "forgot-password":
        return "Recuperar senha";
      case "reset-sent":
        return "Email enviado";
      default:
        return "Acesso Administrativo";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "forgot-password":
        return "Informe seu email para receber o link de recuperação";
      case "reset-sent":
        return "";
      default:
        return "Faça login para gerenciar as publicações";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src={logoLogin} alt="MSGás" className="h-24 w-auto" />
          </div>
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <BookOpen className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-bold mt-4">{getTitle()}</h1>
          {getDescription() && (
            <p className="text-muted-foreground mt-2">{getDescription()}</p>
          )}
        </div>

        <Card className="shadow-xl border-border/50">
          <CardHeader className="pb-4 text-center">
            {mode === "login" && (
              <CardDescription className="text-base">
                Área restrita para administradores
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {mode === "login" && renderLoginForm()}
            {mode === "forgot-password" && renderForgotPasswordForm()}
            {mode === "reset-sent" && renderResetSent()}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Voltar ao site
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
