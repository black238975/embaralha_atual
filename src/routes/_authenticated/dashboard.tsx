import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileStack, FolderOpen, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/AppShell";
import { listarProvas, contarVersoes, agruparPorSerieTurma } from "@/lib/provas";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EmbaralhaProvas" },
      {
        name: "description",
        content: "Resumo das suas provas, versões geradas e atalhos para criar novas avaliações.",
      },
      { property: "og:title", content: "Dashboard — EmbaralhaProvas" },
      { property: "og:description", content: "Resumo das provas e versões do professor." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const provas = useQuery({ queryKey: ["provas"], queryFn: listarProvas });
  const versoes = useQuery({ queryKey: ["versoes-total"], queryFn: contarVersoes });

  const lista = provas.data ?? [];
  const grupos = agruparPorSerieTurma(lista);
  const turmas = grupos.reduce((acc, g) => acc + g.turmas.length, 0);

  const cards = [
    { titulo: "Provas guardadas", valor: lista.length, icone: FolderOpen },
    { titulo: "Versões geradas", valor: versoes.data ?? 0, icone: FileStack },
    { titulo: "Turmas atendidas", valor: turmas, icone: Upload },
  ];

  return (
    <>
      <PageHeader
        titulo="Dashboard"
        descricao="Tudo o que você já embaralhou, em um lugar só."
        acao={
          <Button asChild>
            <Link to="/upload">
              <Plus className="size-4" /> Nova prova
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.titulo} className="panel p-5">
            <c.icone className="size-5 text-primary" />
            <p className="mt-3 font-display text-3xl font-semibold">
              {provas.isLoading ? "—" : c.valor}
            </p>
            <p className="text-sm text-muted-foreground">{c.titulo}</p>
          </div>
        ))}
      </div>

      <section className="panel mt-6 p-5">
        <h2 className="font-display text-lg font-semibold">Provas recentes</h2>
        {provas.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Carregando...</p>
        ) : lista.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Você ainda não gerou nenhuma prova embaralhada.
            </p>
            <Button asChild className="mt-4">
              <Link to="/upload">Enviar minha primeira prova</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {lista.slice(0, 6).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.serie} · {p.turma} · {p.quantidade_versoes} versões ·{" "}
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button asChild size="sm" variant="secondary">
                  <Link to="/provas">Abrir</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
