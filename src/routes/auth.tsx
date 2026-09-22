import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const buscaSchema = z.object({ modo: z.enum(["login", "cadastro"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: buscaSchema,
  head: () => ({
    meta: [
      { title: "Entrar — EmbaralhaProvas" },
      {
        name: "description",
        content: "Acesse sua conta de professor para gerar versões embaralhadas das suas provas.",
      },
      { property: "og:title", content: "Entrar — EmbaralhaProvas" },
      {
        property: "og:description",
        content: "Login e cadastro de professores no EmbaralhaProvas.",
      },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Informe um e-mail válido.").max(255);
const senhaSchema = z.string().min(6, "A senha precisa ter pelo menos 6 caracteres.").max(72);

function AuthPage() {
  const navigate = useNavigate();
  const { modo } = Route.useSearch();
  const [aba, setAba] = useState<"login" | "cadastro">(modo === "cadastro" ? "cadastro" : "login");
  const [carregando, setCarregando] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [aguardandoEmail, setAguardandoEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setVerificando(false);
    });
  }, [navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const emailOk = emailSchema.safeParse(email);
    if (!emailOk.success) { toast.error(emailOk.error.issues[0]!.message); return; }
    if (!senha) { toast.error("Informe sua senha."); return; }
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailOk.data,
      password: senha,
    });
    setCarregando(false);
    if (error) {
      toast.error(
        error.message.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar. Tente novamente.",
      );
      return;
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard", replace: true });
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    const emailOk = emailSchema.safeParse(email);
    if (!emailOk.success) { toast.error(emailOk.error.issues[0]!.message); return; }
    const senhaOk = senhaSchema.safeParse(senha);
    if (!senhaOk.success) { toast.error(senhaOk.error.issues[0]!.message); return; }
    if (!nome.trim()) { toast.error("Informe seu nome."); return; }
    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email: emailOk.data,
      password: senhaOk.data,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome: nome.trim() },
      },
    });
    setCarregando(false);
    if (error) {
      toast.error(
        error.message.includes("already registered")
          ? "Este e-mail já possui conta. Faça login."
          : "Não foi possível criar a conta.",
      );
      return;
    }
    if (data.session) {
      toast.success("Conta criada!");
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    setAguardandoEmail(true);
    toast.success("Conta criada! Confirme o e-mail para entrar.");
  }

  async function esqueciSenha() {
    const emailOk = emailSchema.safeParse(email);
    if (!emailOk.success) { toast.error("Digite seu e-mail para recuperar a senha."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(emailOk.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error("Não foi possível enviar o e-mail de recuperação."); return; }
    toast.success("Enviamos um link de recuperação para o seu e-mail.");
  }

  if (verificando) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Sparkles className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">
            Embaralha<span className="text-primary">Provas</span>
          </span>
        </Link>

        <div className="panel p-6">
          {aguardandoEmail ? (
            <div className="text-center">
              <h1 className="font-display text-xl font-semibold">Confirme seu e-mail</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para
                ativar sua conta e depois volte aqui para entrar.
              </p>
              <Button className="mt-5 w-full" variant="secondary" onClick={() => {
                setAguardandoEmail(false);
                setAba("login");
              }}>
                Voltar para o login
              </Button>
            </div>
          ) : (
            <Tabs value={aba} onValueChange={(v) => setAba(v as "login" | "cadastro")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="cadastro">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form className="mt-5 space-y-4" onSubmit={entrar}>
                  <div className="space-y-1.5">
                    <Label htmlFor="email-login">E-mail</Label>
                    <Input
                      id="email-login"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="professor@escola.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="senha-login">Senha</Label>
                    <Input
                      id="senha-login"
                      type="password"
                      autoComplete="current-password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={esqueciSenha}
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                  <Button className="w-full" disabled={carregando}>
                    {carregando && <Loader2 className="size-4 animate-spin" />} Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="cadastro">
                <form className="mt-5 space-y-4" onSubmit={cadastrar}>
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Maria Silva"
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email-cad">E-mail</Label>
                    <Input
                      id="email-cad"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="professor@escola.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="senha-cad">Senha</Label>
                    <Input
                      id="senha-cad"
                      type="password"
                      autoComplete="new-password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="mínimo 6 caracteres"
                    />
                  </div>
                  <Button className="w-full" disabled={carregando}>
                    {carregando && <Loader2 className="size-4 animate-spin" />} Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
