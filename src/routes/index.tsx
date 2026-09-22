import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileCheck2,
  FolderTree,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Images,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EmbaralhaProvas — versões embaralhadas da sua prova em Word" },
      {
        name: "description",
        content:
          "Envie a prova em Word (.docx) e gere até 10 versões com questões e alternativas embaralhadas, mantendo imagens, tabelas e o cabeçalho originais.",
      },
      { property: "og:title", content: "EmbaralhaProvas — versões embaralhadas em Word" },
      {
        property: "og:description",
        content:
          "Sistema para professores: upload da prova em .docx, geração de versões embaralhadas, download em ZIP e organização por série e turma.",
      },
    ],
  }),
  component: Landing,
});

const RECURSOS = [
  {
    icon: Shuffle,
    titulo: "Embaralhamento inteligente",
    texto:
      "Detecta questões em formatos 1., 1), (1), 01. ou “Questão 1” e renumera conforme a nova posição.",
  },
  {
    icon: Images,
    titulo: "Conteúdo preservado",
    texto:
      "O documento é reconstruído preservando imagens, gráficos, tabelas, fórmulas e formatação de cada questão.",
  },
  {
    icon: FileCheck2,
    titulo: "Alternativas embaralhadas",
    texto: "As alternativas mudam de posição e as letras a), b), c) ... até z) são refeitas automaticamente.",
  },
  {
    icon: FolderTree,
    titulo: "Organização por turma",
    texto: "Suas provas ficam guardadas e organizadas por série e turma, prontas para reutilizar.",
  },
  {
    icon: Printer,
    titulo: "Pronto para imprimir",
    texto: "Baixe cada versão em .docx, edite no Word se quiser e leve todas de uma vez em um ZIP.",
  },
  {
    icon: ShieldCheck,
    titulo: "Privado por padrão",
    texto: "Cada professor acessa somente as próprias provas e arquivos.",
  },
];

function Landing() {
  const navigate = useNavigate();
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setVerificando(false);
    });
  }, [navigate]);

  if (verificando) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Sparkles className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">
            Embaralha<span className="text-primary">Provas</span>
          </span>
        </div>
        <Button asChild variant="secondary">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-14 pt-8 sm:pt-16">
        <p className="mb-4 inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Feito para professores
        </p>
        <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
          Uma prova, <span className="text-gradient">até 10 versões embaralhadas</span> em minutos.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Envie o arquivo Word da sua avaliação. O EmbaralhaProvas identifica as questões, embaralha a
          ordem, as alternativas e as afirmações V/F, renumera tudo e devolve arquivos .docx
          prontos para imprimir.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Começar agora</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/auth" search={{ modo: "cadastro" }}>
              Criar conta grátis
            </Link>
          </Button>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RECURSOS.map((r) => (
            <article key={r.titulo} className="panel p-5">
              <r.icon className="size-6 text-primary" />
              <h2 className="mt-3 font-display text-base font-semibold">{r.titulo}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{r.texto}</p>
            </article>
          ))}
        </div>

        <div className="panel mt-12 flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="font-display text-xl font-semibold">Upload → Geração → Resultados</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              E tudo fica guardado, para sempre, em Minhas Provas.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/auth">Entrar no sistema</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        EmbaralhaProvas — Henrique S.
      </footer>
    </div>
  );
}
