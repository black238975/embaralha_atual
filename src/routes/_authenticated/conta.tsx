import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, LogOut, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/AppShell";
import { listarProvas, contarVersoes } from "@/lib/provas";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useFluxo } from "@/lib/fluxo";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: "Minha conta — EmbaralhaProvas" },
      {
        name: "description",
        content: "Dados do professor, alteração de senha e resumo de uso do EmbaralhaProvas.",
      },
      { property: "og:title", content: "Minha conta — EmbaralhaProvas" },
      { property: "og:description", content: "Configurações da conta do professor." },
    ],
  }),
  component: Conta,
});

function Conta() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { limparTudo } = useFluxo();
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [senha, setSenha] = useState("");
  const [alterando, setAlterando] = useState(false);

  const provas = useQuery({ queryKey: ["provas"], queryFn: listarProvas });
  const versoes = useQuery({ queryKey: ["versoes-total"], queryFn: contarVersoes });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setEmail(data.user.email ?? "");
      const { data: perfil } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", data.user.id)
        .maybeSingle();
      setNome(perfil?.nome ?? (data.user.user_metadata?.["nome"] as string) ?? "");
    })();
  }, []);

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe seu nome.");
      return;
    }
    setSalvando(true);
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({ nome: nome.trim() })
      .eq("id", data.user!.id);
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar seu nome.");
      return;
    }
    toast.success("Dados atualizados.");
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setAlterando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setAlterando(false);
    if (error) {
      toast.error("Não foi possível alterar a senha.");
      return;
    }
    setSenha("");
    toast.success("Senha alterada.");
  }

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    limparTudo();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      <PageHeader titulo="Minha conta" descricao="Seus dados e o resumo do seu uso." />

      <div className="grid gap-6 lg:grid-cols-2">
        <form className="panel space-y-4 p-5" onSubmit={salvarPerfil}>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <UserRound className="size-5" />
            </span>
            <h2 className="font-display text-lg font-semibold">Dados do professor</h2>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={email} disabled />
          </div>
          <Button disabled={salvando}>
            {salvando && <Loader2 className="size-4 animate-spin" />} Salvar
          </Button>
        </form>

        <div className="space-y-6">
          <form className="panel space-y-4 p-5" onSubmit={trocarSenha}>
            <h2 className="font-display text-lg font-semibold">Alterar senha</h2>
            <div className="space-y-1.5">
              <Label htmlFor="nova-senha">Nova senha</Label>
              <Input
                id="nova-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="mínimo 6 caracteres"
              />
            </div>
            <Button variant="secondary" disabled={alterando}>
              {alterando && <Loader2 className="size-4 animate-spin" />} Atualizar senha
            </Button>
          </form>

          <div className="panel p-5">
            <h2 className="font-display text-lg font-semibold">Resumo</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Provas guardadas</dt>
                <dd className="font-semibold">{provas.data?.length ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Versões geradas</dt>
                <dd className="font-semibold">{versoes.data ?? 0}</dd>
              </div>
            </dl>
            <Button variant="ghost" className="mt-4 text-destructive" onClick={sair}>
              <LogOut className="size-4" /> Sair da conta
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
