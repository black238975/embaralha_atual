import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  FileStack,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Shuffle,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useFluxo } from "@/lib/fluxo";
import { useQueryClient } from "@tanstack/react-query";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/gerar", label: "Gerar", icon: Shuffle },
  { to: "/resultados", label: "Resultados", icon: FileStack },
  { to: "/provas", label: "Minhas Provas", icon: FolderOpen },
  { to: "/conta", label: "Minha Conta", icon: UserRound },
] as const;

function Marca({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-5 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
        <Sparkles className="size-5" />
      </span>

      {!compact && (
        <div>
          <div className="font-display text-lg font-semibold tracking-tight">
            Embaralha<span className="text-primary">Provas</span>
          </div>

          <div className="text-xs text-primary">
            ©creator - Henrique S.
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { limparTudo } = useFluxo();
  const [aberto, setAberto] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    limparTudo();
    await supabase.auth.signOut();
    toast.success("Você saiu da sua conta.");
    navigate({ to: "/auth", replace: true });
  }

  const links = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const ativo = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              ativo
                ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            )}
          >
            <item.icon className="size-4.5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Menu lateral — computador */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Link to="/dashboard" className="px-1 py-2">
          <Marca />
        </Link>
        {links}
        <Button variant="ghost" className="mt-auto justify-start gap-3" onClick={sair}>
          <LogOut className="size-4.5" /> Sair
        </Button>
      </aside>

      <div className="flex min-h-screen w-full flex-col">
        {/* Topo — celular e tablet */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
          <Link to="/dashboard">
            <Marca />
          </Link>
          <Sheet open={aberto} onOpenChange={setAberto}>
            <SheetTrigger asChild>
              <Button variant="secondary" size="icon" aria-label="Abrir menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-sidebar p-4">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="mb-6 mt-2">
                <Marca />
              </div>
              {links}
              <Button variant="ghost" className="mt-4 w-full justify-start gap-3" onClick={sair}>
                <LogOut className="size-4.5" /> Sair
              </Button>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">{children}</main>

        {/* Menu inferior — celular */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {NAV.slice(0, 5).map((item) => {
            const ativo = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  ativo ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" />
                {item.label === "Minhas Provas" ? "Provas" : item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function PageHeader({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}
