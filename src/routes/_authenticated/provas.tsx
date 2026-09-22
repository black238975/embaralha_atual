import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import JSZip from "jszip";
import { toast } from "sonner";
import { ChevronDown, Download, Eye, FileArchive, FileCheck2, FolderOpen, Search, Trash2 } from "lucide-react";
import { VisualizadorDocx } from "@/components/VisualizadorDocx";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/AppShell";
import { erroApp } from "@/lib/erros";
import { nomeArquivoZip } from "@/lib/docx/generate";
import {
  agruparPorSerieTurma,
  baixarArquivo,
  excluirProva,
  listarProvas,
  listarVersoes,
  salvarBlob,
  type Prova,
} from "@/lib/provas";

export const Route = createFileRoute("/_authenticated/provas")({
  head: () => ({
    meta: [
      { title: "Minhas Provas — EmbaralhaProvas" },
      {
        name: "description",
        content: "Todas as suas provas embaralhadas guardadas e organizadas por série e turma.",
      },
      { property: "og:title", content: "Minhas Provas — EmbaralhaProvas" },
      { property: "og:description", content: "Arquivo permanente das provas geradas." },
    ],
  }),
  component: MinhasProvas,
});

function MinhasProvas() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [excluindo, setExcluindo] = useState<Prova | null>(null);

  const provas = useQuery({ queryKey: ["provas"], queryFn: listarProvas });

  const filtradas = (provas.data ?? []).filter((p) => {
    const t = busca.trim().toLowerCase();
    if (!t) return true;
    return [p.nome, p.serie, p.turma].some((v) => v.toLowerCase().includes(t));
  });
  const grupos = agruparPorSerieTurma(filtradas);

  function alternar(id: string) {
    setAbertas((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    try {
      await excluirProva(excluindo.id);
      toast.success("Prova excluída.");
      queryClient.invalidateQueries();
    } catch (err) {
      const e = erroApp("Excluir a prova", err);
      toast.error(e.message, { description: e.detalhe });
    } finally {
      setExcluindo(null);
    }
  }

  return (
    <>
      <PageHeader
        titulo="Minhas Provas"
        descricao="Arquivo permanente, organizado por série e turma."
        acao={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar prova, série ou turma"
              className="pl-9"
            />
          </div>
        }
      />

      {provas.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : grupos.length === 0 ? (
        <div className="panel p-8 text-center">
          <FolderOpen className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {busca ? "Nenhuma prova encontrada para essa busca." : "Você ainda não tem provas salvas."}
          </p>
          {!busca && (
            <Button asChild className="mt-4">
              <Link to="/upload">Enviar uma prova</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => (
            <section key={g.serie} className="panel p-5">
              <h2 className="font-display text-lg font-semibold">{g.serie}</h2>
              <div className="mt-3 space-y-4">
                {g.turmas.map((t) => (
                  <div key={t.turma}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t.turma}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {t.provas.map((p) => (
                        <li key={p.id} className="rounded-xl border border-border/70 bg-card/60">
                          <button
                            type="button"
                            onClick={() => alternar(p.id)}
                            className="flex w-full items-center gap-3 p-4 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{p.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.quantidade_versoes} versões · {p.total_questoes} questões ·{" "}
                                {new Date(p.created_at).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                            <ChevronDown
                              className={
                                "size-4 shrink-0 text-muted-foreground transition-transform " +
                                (abertas.has(p.id) ? "rotate-180" : "")
                              }
                            />
                          </button>
                          {abertas.has(p.id) && (
                            <VersoesDaProva prova={p} onExcluir={() => setExcluindo(p)} />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(excluindo)} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta prova?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as versões geradas de “{excluindo?.nome}” serão apagadas definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function VersoesDaProva({ prova, onExcluir }: { prova: Prova; onExcluir: () => void }) {
  const [zipando, setZipando] = useState(false);
  const [previa, setPrevia] = useState<{ nome: string; caminho: string } | null>(null);
  const carregarPrevia = useCallback(() => baixarArquivo(previa!.caminho), [previa]);
  const versoes = useQuery({
    queryKey: ["versoes", prova.id],
    queryFn: () => listarVersoes(prova.id),
  });


  async function baixar(caminho: string) {
    try {
      const blob = await baixarArquivo(caminho);
      salvarBlob(blob, caminho.split("/").pop() ?? "prova.docx");
    } catch (err) {
      const e = erroApp("Baixar o arquivo", err);
      toast.error(e.message, { description: e.detalhe });
    }
  }

  async function baixarZip() {
    setZipando(true);
    try {
      const zip = new JSZip();
      const pasta = zip.folder(`${prova.serie} - ${prova.turma}`) ?? zip;
      for (const v of versoes.data ?? []) {
        pasta.file(v.arquivo.split("/").pop() ?? `${v.nome}.docx`, await baixarArquivo(v.arquivo));
        if (v.gabarito) pasta.file(v.gabarito.split("/").pop() ?? `Gabarito_${v.nome}.docx`, await baixarArquivo(v.gabarito));
      }
      salvarBlob(await zip.generateAsync({ type: "blob" }), nomeArquivoZip(prova.nome));
      toast.success("ZIP baixado.");
    } catch (err) {
      const e = erroApp("Montar o ZIP das versões", err);
      toast.error(e.message, { description: e.detalhe });
    } finally {
      setZipando(false);
    }
  }

  const lista = versoes.data ?? [];

  return (
    <div className="border-t border-border/70 p-4">
      {versoes.isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando versões...</p>
      ) : lista.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma versão salva para esta prova.</p>
      ) : (
        <ul className="space-y-2">
          {lista.map((v) => (
            <li
              key={v.id}
              className="flex flex-wrap items-center gap-2 rounded-lg bg-background/40 px-3 py-2"
            >
              <span className="text-sm font-medium">{v.nome}</span>
              <div className="ml-auto flex flex-wrap gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setPrevia({ nome: v.nome, caminho: v.arquivo })}>
                  <Eye className="size-4" /> Prova
                </Button>
                <Button size="sm" variant="ghost" onClick={() => baixar(v.arquivo)}>
                  <Download className="size-4" /> Baixar prova
                </Button>
                {v.gabarito && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setPrevia({ nome: `Gabarito ${v.nome}`, caminho: v.gabarito! })}>
                      <FileCheck2 className="size-4" /> Gabarito
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => baixar(v.gabarito!)}>
                      <Download className="size-4" /> Baixar gabarito
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {previa && (
        <VisualizadorDocx
          aberto={!!previa}
          onOpenChange={(a) => !a && setPrevia(null)}
          titulo={previa.nome}
          descricao="Confira o documento antes de baixar o arquivo."
          carregar={carregarPrevia}
        />
      )}


      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={baixarZip} disabled={zipando || !lista.length}>
          <FileArchive className="size-4" /> {zipando ? "Compactando..." : "Baixar todas (ZIP)"}
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onExcluir}>
          <Trash2 className="size-4" /> Excluir prova
        </Button>
      </div>
    </div>
  );
}
