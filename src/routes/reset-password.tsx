import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — EmbaralhaProvas" },
      { name: "description", content: "Defina uma nova senha para sua conta no EmbaralhaProvas." },
      { property: "og:title", content: "Nova senha — EmbaralhaProvas" },
      { property: "og:description", content: "Recuperação de senha do EmbaralhaProvas." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setPronto(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setPronto(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirma) {
      toast.error("As senhas não conferem.");
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível alterar a senha. Peça um novo link.");
      return;
    }
    toast.success("Senha alterada com sucesso!");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="panel w-full max-w-md p-6">
        <h1 className="font-display text-xl font-semibold">Definir nova senha</h1>
        {!pronto ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Abra esta página pelo link enviado no seu e-mail de recuperação.
          </p>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={salvar}>
            <div className="space-y-1.5">
              <Label htmlFor="nova">Nova senha</Label>
              <Input
                id="nova"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conf">Confirmar senha</Label>
              <Input
                id="conf"
                type="password"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
              />
            </div>
            <Button className="w-full" disabled={carregando}>
              {carregando && <Loader2 className="size-4 animate-spin" />} Salvar senha
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
