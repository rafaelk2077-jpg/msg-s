import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, User, Building2, ArrowLeft, BookOpen, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoLogin from "@/assets/Logo-principal.svg";
import loginBg from "@/assets/login-bg.jpg";

type AuthMode = "login" | "register" | "forgot-password" | "reset-sent";

const GERENCIAS: Record<string, string[]> = {
  DTC: ["GEPRO", "GECOM", "GESMA", "GETEC", "GEOP", "GERELE", "ATECOM"],
  DAF: ["GEFIN", "GECONT", "GEPC", "ASDAF", "GERAS", "GELC", "GETI"],
  PRES: ["GEJUR", "ASPRES", "GEPES", "ASGRC"]
};

const DIRECTOR_MAP: Record<string, { diretoria: string; gerencia: string; }> = {
  "cristiane@msgas.com.br": { diretoria: "PRES", gerencia: "PRES" },
  "gisele@msgas.com.br": { diretoria: "DAF", gerencia: "DAF" },
  "fabricio@msgas.com.br": { diretoria: "DTC", gerencia: "DTC" }
};

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [diretoria, setDiretoria] = useState("");
  const [gerencia, setGerencia] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [errorMessage, setErrorMessage] = useState("");

  const emailLower = email.toLowerCase().trim();
  const directorInfo = DIRECTOR_MAP[emailLower];
  const isDirector = !!directorInfo;

  useEffect(() => {
    if (mode === "register" && directorInfo) {
      setDiretoria(directorInfo.diretoria);
      setGerencia(directorInfo.gerencia);
    }
  }, [emailLower, mode, directorInfo]);

  useEffect(() => {
    if (!isDirector) setGerencia("");
  }, [diretoria, isDirector]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/home");
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Ensure profile exists
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (!profile) {
          const meta = session.user.user_metadata || {};
          await supabase.from("profiles").insert({
            user_id: session.user.id,
            name: meta.name || session.user.email?.split("@")[0] || "Usuário",
            diretoria: meta.diretoria || "N/A",
            gerencia: meta.gerencia || "N/A",
          });
        }
        navigate("/home");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateEmail = (email: string) => email.toLowerCase().trim().endsWith("@msgas.com.br");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    if (!validateEmail(email)) { setErrorMessage("Apenas emails @msgas.com.br são permitidos."); setIsLoading(false); return; }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: emailLower, password });
      if (error) throw error;
      toast({ title: "Login realizado!", description: "Bem-vindo de volta." });
    } catch (error: any) {
      const msg = error.message === "Invalid login credentials" ? "Email ou senha incorretos." :
        error.message === "Email not confirmed" ? "Confirme seu email antes de fazer login." :
          `Erro: ${error.message}`;
      setErrorMessage(msg);
    } finally { setIsLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    if (!validateEmail(email)) { setErrorMessage("Apenas emails @msgas.com.br são permitidos."); setIsLoading(false); return; }
    if (!name.trim() || !diretoria || !gerencia) { setErrorMessage("Preencha todos os campos."); setIsLoading(false); return; }
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailLower,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { name: name.trim(), diretoria, gerencia },
        },
      });
      if (error) throw error;
      // Trigger handle_new_user picks up metadata; upsert as fallback
      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          { user_id: data.user.id, name: name.trim(), diretoria, gerencia },
          { onConflict: "user_id" }
        );
        if (profileError) console.error("Profile error:", profileError);
      }
      toast({ title: "Cadastro realizado!", description: "Verifique seu email para confirmar." });
      setMode("login");
    } catch (error: any) {
      setErrorMessage(error.message.includes("already registered") ? "Este email já está cadastrado." : `Erro: ${error.message}`);
    } finally { setIsLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    if (!validateEmail(email)) { setErrorMessage("Apenas emails @msgas.com.br são permitidos."); setIsLoading(false); return; }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailLower, { redirectTo: `${window.location.origin}/login?reset=true` });
      if (error) throw error;
      setMode("reset-sent");
    } catch (error: any) { setErrorMessage(`Erro: ${error.message}`); } finally { setIsLoading(false); }
  };

  const availableGerencias = diretoria ? GERENCIAS[diretoria] || [] : [];

  const titles: Record<AuthMode, string> = { login: "Acesso ao Sistema", register: "Criar Conta", "forgot-password": "Recuperar Senha", "reset-sent": "Email Enviado" };
  const descriptions: Record<AuthMode, string> = { login: "Faça login com seu email corporativo", register: "Preencha seus dados para criar uma conta", "forgot-password": "Informe seu email para recuperar a senha", "reset-sent": "" };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - CTA */}
      <div className="relative lg:w-1/2 min-h-[280px] lg:min-h-screen flex items-center justify-center overflow-hidden">
        <img src={loginBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/85" />
        <div className="relative z-10 p-8 lg:p-16 max-w-lg text-center lg:text-left">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>





            <h2 className="font-display text-3xl lg:text-4xl font-bold text-primary-foreground leading-tight mb-4">
              Acervo de Newsletters e Jornais
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 leading-relaxed">
              Acesse o acervo completo de comunicação interna da MSGás. Newsletters, jornais e publicações institucionais em um só lugar.
            </p>






















          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logoLogin} alt="MSGás" className="h-24 w-auto mx-auto mb-6" />
            <h1 className="font-display text-2xl font-bold">{titles[mode]}</h1>
            {descriptions[mode] && <p className="text-muted-foreground mt-2">{descriptions[mode]}</p>}
          </div>

          <div className="space-y-6">
            {mode === "login" &&
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="seu.nome@msgas.com.br" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="••••••••" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                  </div>
                </div>
                {errorMessage && <ErrorBanner message={errorMessage} />}
                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Entrar
                </Button>
                <div className="flex justify-between text-sm">
                  <button type="button" onClick={() => { setMode("forgot-password"); setErrorMessage(""); }} className="text-muted-foreground hover:text-foreground transition-colors">Esqueci minha senha</button>
                  <button type="button" onClick={() => { setMode("register"); setErrorMessage(""); }} className="text-primary hover:text-primary/80 font-medium transition-colors">Criar conta</button>
                </div>
              </form>
            }

            {mode === "register" &&
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-name" placeholder="Seu nome completo" className="pl-10" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email corporativo</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-email" type="email" placeholder="seu.nome@msgas.com.br" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-password" type="password" placeholder="Mínimo 6 caracteres" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Diretoria</Label>
                  <Select value={diretoria} onValueChange={setDiretoria} disabled={isDirector}>
                    <SelectTrigger><Building2 className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Selecione a diretoria" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DTC">DTC</SelectItem>
                      <SelectItem value="DAF">DAF</SelectItem>
                      <SelectItem value="PRES">PRES</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {diretoria &&
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                    <Label>Gerência / Setor</Label>
                    <Select value={gerencia} onValueChange={setGerencia} disabled={isDirector}>
                      <SelectTrigger><SelectValue placeholder="Selecione a gerência" /></SelectTrigger>
                      <SelectContent>
                        {isDirector && directorInfo && <SelectItem value={directorInfo.gerencia}>{directorInfo.gerencia}</SelectItem>}
                        {!isDirector && availableGerencias.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </motion.div>
                }
                {errorMessage && <ErrorBanner message={errorMessage} />}
                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Criar conta
                </Button>
                <button type="button" onClick={() => { setMode("login"); setErrorMessage(""); }} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="inline-block h-3 w-3 mr-1" /> Já tenho conta
                </button>
              </form>
            }

            {mode === "forgot-password" &&
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email cadastrado</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="reset-email" type="email" placeholder="seu.nome@msgas.com.br" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>
                {errorMessage && <ErrorBanner message={errorMessage} />}
                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Enviar link de recuperação
                </Button>
                <button type="button" onClick={() => { setMode("login"); setErrorMessage(""); }} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="inline-block h-3 w-3 mr-1" /> Voltar ao login
                </button>
              </form>
            }

            {mode === "reset-sent" &&
              <div className="space-y-4 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Verifique seu email</h3>
                  <p className="text-sm text-muted-foreground mt-1">Enviamos um link para <strong>{email}</strong></p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => { setMode("login"); setErrorMessage(""); }}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao login
                </Button>
              </div>
            }
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">



          </p>
        </motion.div>
      </div>
    </div>);

};

const ErrorBanner = ({ message }: { message: string; }) =>
  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
    className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
    {message}
  </motion.div>;


export default Login;