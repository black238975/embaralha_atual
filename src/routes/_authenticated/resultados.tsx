import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { Download, Eye, FileArchive, FileCheck2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/AppShell";
import { VisualizadorDocx } from "@/components/VisualizadorDocx";
import { useFluxo } from "@/lib/fluxo";
import { nomeArquivoZip } from "@/lib/docx/generate";
import { salvarBlob } from "@/lib/provas";
import { erroApp } from "@/lib/erros";


export const Route = createFileRoute("/_authenticated/resultados")({
  head: () => ({
    meta: [
      { title: "Resultados da geração — EmbaralhaProvas" },
      {
        name: "description",
        content: "Visualize, imprima e baixe as versões embaralhadas geradas para sua turma.",
      },
      { property: "og:title", content: "Resultados da geração — EmbaralhaProvas" },
      { property: "og:description", content: "Versões embaralhadas prontas para download e ZIP." },
    ],
  }),
  component: Resultados,
});

function Resultados() {
  const { resultado } = useFluxo();
  const [zipando, setZipando] = useState(false);
  const [previa, setPrevia] = useState<{ nome: string; blob: Blob } | null>(null);
  const carregarPrevia = useCallback(async () => previa!.blob, [previa]);


  if (!resultado) {
    return (
      <>
        <PageHeader titulo="Resultados" />
        <div className="panel p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma geração recente. Suas provas anteriores continuam salvas em Minhas Provas.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to="/upload">Nova prova</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/provas">Minhas Provas</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  async function baixarZip() {
    if (!resultado) return;
    setZipando(true);
    try {
      const zip = new JSZip();
      const pasta = zip.folder(`${resultado.serie} - ${resultado.turma}`) ?? zip;
      for (const v of resultado.versoes) {
        pasta.file(v.arquivo.split("/").pop() ?? v.arquivo, v.blob);
        if (v.gabarito) pasta.file(v.gabarito.arquivo, v.gabarito.blob);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      salvarBlob(blob, nomeArquivoZip(resultado.nome));
      toast.success("ZIP baixado com todas as versões.");
    } catch (err) {
      const e = erroApp("Montar o ZIP das versões", err);
      toast.error(e.message, { description: e.detalhe });
    } finally {
      setZipando(false);
    }
  }

  return (
    <>
      <PageHeader
        titulo="Versões prontas"
        descricao={`${resultado.nome} · ${resultado.serie} · ${resultado.turma}`}
        acao={
          <div className="flex flex-wrap gap-2">
            <Button onClick={baixarZip} disabled={zipando}>
              <FileArchive className="size-4" /> {zipando ? "Compactando..." : "Baixar todas (ZIP)"}
            </Button>
            <Button asChild variant="secondary">
              <Link to="/upload">
                <Plus className="size-4" /> Nova prova
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {resultado.versoes.map((v) => (
          <article key={v.letra} className="panel flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/15 font-display text-lg font-semibold text-primary ring-1 ring-primary/25">
                {v.letra}
              </span>
              <div className="min-w-0">
                <p className="font-display text-base font-semibold">{v.nome}</p>
                <p className="truncate text-xs text-muted-foreground">{v.arquivo}</p>
              </div>
            </div>
            <div className={"mt-auto grid gap-3 " + (v.gabarito ? "sm:grid-cols-2" : "")}>
              <div className="grid gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prova</p>
                <Button size="sm" className="w-full" onClick={() => setPrevia({ nome: v.nome, blob: v.blob })}>
                  <Eye className="size-4" /> Visualizar
                </Button>
                <Button size="sm" variant="secondary" className="w-full" onClick={() => salvarBlob(v.blob, v.arquivo.split("/").pop() ?? v.arquivo)}>
                  <Download className="size-4" /> Baixar
                </Button>
              </div>
              {v.gabarito && (
                <div className="grid gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Gabarito</p>
                  <Button size="sm" className="w-full" onClick={() => setPrevia({ nome: `Gabarito ${v.letra}`, blob: v.gabarito!.blob })}>
                    <FileCheck2 className="size-4" /> Visualizar
                  </Button>
                  <Button size="sm" variant="secondary" className="w-full" onClick={() => salvarBlob(v.gabarito!.blob, v.gabarito!.arquivo)}>
                    <Download className="size-4" /> Baixar
                  </Button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {previa && (
        <VisualizadorDocx
          aberto={!!previa}
          onOpenChange={(a) => !a && setPrevia(null)}
          titulo={previa.nome}
          descricao="Confira o documento antes de baixar o arquivo."
          carregar={carregarPrevia}
        />
      )}


      <p className="mt-6 text-sm text-muted-foreground">
        Essas versões já estão guardadas para sempre em{" "}
        <Link to="/provas" className="text-primary hover:underline">
          Minhas Provas
        </Link>
        , organizadas por série e turma.
      </p>

    </>
  );
}
