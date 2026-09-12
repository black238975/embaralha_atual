import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, FileCheck2, FileText, Loader2, Pencil, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/AppShell";
import { analisarDocx } from "@/lib/docx/analyze";
import { useFluxo } from "@/lib/fluxo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Enviar prova em DOCX — EmbaralhaProvas" },
      {
        name: "description",
        content:
          "Envie o arquivo Word (.docx) da sua prova e deixe o sistema identificar as questões automaticamente.",
      },
      { property: "og:title", content: "Enviar prova em DOCX — EmbaralhaProvas" },
      {
        property: "og:description",
        content: "Upload da avaliação em Word para geração de versões embaralhadas.",
      },
    ],
  }),
  component: UploadPage,
});

const TAMANHO_MAX = 20 * 1024 * 1024;
const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function UploadPage() {
  const navigate = useNavigate();
  const { setUpload } = useFluxo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [nome, setNome] = useState("");
  const [serie, setSerie] = useState("");
  const [turma, setTurma] = useState("");
  const [processando, setProcessando] = useState(false);
  const [modoCorrecao, setModoCorrecao] = useState<"gabarito" | "manual">("manual");
  const [arquivoGabarito, setArquivoGabarito] = useState<File | null>(null);
  const gabaritoRef = useRef<HTMLInputElement>(null);

  function escolher(f: File | undefined | null) {
    if (!f) return;
    const ehDocx = f.type === MIME_DOCX || f.name.toLowerCase().endsWith(".docx");
    if (!ehDocx) {
      if (f.name.toLowerCase().endsWith(".doc")) {
        toast.error("Arquivos .doc antigos não são aceitos. Salve como .docx no Word e envie de novo.");
        return;
      }
      toast.error("Envie um arquivo Word (.docx). Outros formatos não são aceitos.");
      return;
    }
    if (f.size > TAMANHO_MAX) {
      toast.error("O arquivo passa de 20 MB. Reduza o documento e tente de novo.");
      return;
    }
    if (f.size === 0) {
      toast.error("Este arquivo está vazio.");
      return;
    }
    setArquivo(f);
    if (!nome) setNome(f.name.replace(/\.docx$/i, ""));
  }

  function escolherGabarito(f: File | undefined | null) {
    if (!f) return;
    const ehDocx = f.type === MIME_DOCX || f.name.toLowerCase().endsWith(".docx");
    if (!ehDocx) {
      toast.error("O gabarito também precisa ser um arquivo Word (.docx).");
      return;
    }
    if (f.size > TAMANHO_MAX || f.size === 0) {
      toast.error("O arquivo do gabarito está vazio ou passa de 20 MB.");
      return;
    }
    setArquivoGabarito(f);
    setModoCorrecao("gabarito");
  }

  async function continuar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) {
      toast.error("Selecione o arquivo .docx da prova.");
      return;
    }
    if (!nome.trim() || !serie.trim() || !turma.trim()) {
      toast.error("Preencha nome da prova, série e turma.");
      return;
    }
    if (modoCorrecao === "gabarito" && !arquivoGabarito) {
      toast.error("Envie o arquivo do gabarito ou marque Corrigir manualmente.");
      return;
    }
    setProcessando(true);
    try {
      const bytes = await arquivo.arrayBuffer();
      const analise = await analisarDocx(bytes);
      if (analise.questoes.length < 2) {
        toast.error(
          "Não encontramos questões neste documento. Verifique se as questões começam com 1., 2), (3), “Questão 4” ou usam a numeração automática de lista do Word.",
        );
        setProcessando(false);
        return;
      }
      let gabarito: { file: File; bytes: ArrayBuffer; analise: Awaited<ReturnType<typeof analisarDocx>> } | undefined;
      if (modoCorrecao === "gabarito" && arquivoGabarito) {
        const bytesGab = await arquivoGabarito.arrayBuffer();
        const analiseGab = await analisarDocx(bytesGab);
        if (analiseGab.questoes.length !== analise.questoes.length) {
          toast.error(
            `A prova tem ${analise.questoes.length} questões, mas o gabarito tem ${analiseGab.questoes.length}. Numere as respostas do gabarito na mesma ordem da prova.`,
          );
          return;
        }
        gabarito = { file: arquivoGabarito, bytes: bytesGab, analise: analiseGab };
      }
      setUpload({
        file: arquivo,
        bytes,
        analise,
        caminho: `${nome.trim()}|${serie.trim()}|${turma.trim()}`,
        modoCorrecao,
        gabarito,
      });
      toast.success(`${analise.questoes.length} questões identificadas.`);
      navigate({ to: "/gerar" });
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível ler este documento. Ele pode estar protegido ou corrompido.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <PageHeader
        titulo="Enviar prova"
        descricao="Escolha o arquivo Word (.docx) original. Nada é salvo definitivamente até você gerar as versões."
      />

      <form className="grid gap-6 lg:grid-cols-[1.2fr_1fr]" onSubmit={continuar}>
        <div
          className={cn(
            "panel flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-8 text-center transition-colors",
            arrastando ? "border-primary bg-primary/5" : "border-border",
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            escolher(e.dataTransfer.files?.[0]);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => escolher(e.target.files?.[0])}
          />
          {arquivo ? (
            <>
              <FileText className="size-10 text-primary" />
              <p className="max-w-full truncate text-sm font-medium">{arquivo.name}</p>
              <p className="text-xs text-muted-foreground">
                {(arquivo.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setArquivo(null);
                }}
              >
                <X className="size-4" /> Trocar arquivo
              </Button>
            </>
          ) : (
            <>
              <UploadCloud className="size-10 text-primary" />
              <p className="text-sm font-medium">Arraste o .docx aqui ou toque para escolher</p>
              <p className="text-xs text-muted-foreground">Somente Word (.docx) · até 20 MB</p>
            </>
          )}
        </div>

        <div className="panel space-y-4 p-5 lg:col-span-2">
          <div>
            <h2 className="font-display text-base font-semibold">Como será a correção?</h2>
            <p className="mt-1 text-xs text-muted-foreground">Envie o gabarito para gerar um correspondente a cada versão ou escolha correção manual.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setModoCorrecao("gabarito")}
              className={cn("rounded-xl border p-4 text-left transition-colors", modoCorrecao === "gabarito" ? "border-primary bg-primary/10" : "border-border")}
            >
              <FileCheck2 className="mb-2 size-5 text-primary" />
              <span className="block text-sm font-semibold">Enviar gabarito</span>
              <span className="mt-1 block text-xs text-muted-foreground">Aceita respostas objetivas A–Z, V/F, lacunas, associação e respostas abertas.</span>
            </button>
            <button
              type="button"
              onClick={() => { setModoCorrecao("manual"); setArquivoGabarito(null); }}
              className={cn("rounded-xl border p-4 text-left transition-colors", modoCorrecao === "manual" ? "border-primary bg-primary/10" : "border-border")}
            >
              <Pencil className="mb-2 size-5 text-primary" />
              <span className="block text-sm font-semibold">Corrigir manualmente</span>
              <span className="mt-1 block text-xs text-muted-foreground">Gera somente as versões da prova, sem arquivo de gabarito.</span>
            </button>
          </div>
          {modoCorrecao === "gabarito" && (
            <div className="rounded-xl border border-dashed border-border p-4">
              <input ref={gabaritoRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => escolherGabarito(e.target.files?.[0])} />
              {arquivoGabarito ? (
                <div className="flex flex-wrap items-center gap-3">
                  <CheckCircle2 className="size-5 text-primary" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{arquivoGabarito.name}</p><p className="text-xs text-muted-foreground">Gabarito selecionado</p></div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => gabaritoRef.current?.click()}>Trocar</Button>
                </div>
              ) : (
                <Button type="button" variant="secondary" className="w-full" onClick={() => gabaritoRef.current?.click()}>
                  <UploadCloud className="size-4" /> Selecionar gabarito .docx
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="panel space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome da prova</Label>
            <Input
              id="nome"
              value={nome}
              maxLength={120}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Prova de Matemática — 1º bimestre"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="serie">Série / Ano</Label>
            <Input
              id="serie"
              value={serie}
              maxLength={60}
              onChange={(e) => setSerie(e.target.value)}
              placeholder="9º ano"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="turma">Turma</Label>
            <Input
              id="turma"
              value={turma}
              maxLength={60}
              onChange={(e) => setTurma(e.target.value)}
              placeholder="Turma B"
            />
          </div>
          <Button className="w-full" disabled={processando}>
            {processando && <Loader2 className="size-4 animate-spin" />}
            {processando ? "Analisando o documento..." : "Analisar questões"}
          </Button>
          <p className="text-xs text-muted-foreground">
            O sistema reconhece questões escritas como <strong>1.</strong>, <strong>1)</strong>,{" "}
            <strong>(1)</strong>, <strong>01.</strong> ou <strong>Questão 1</strong>, alternativas
            de <strong>a)</strong> até <strong>z)</strong> e afirmações <strong>( ) V/F</strong>.
          </p>
        </div>
      </form>
    </>
  );
}
