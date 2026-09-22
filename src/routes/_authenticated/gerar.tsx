import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Shuffle, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/AppShell";
import { useFluxo } from "@/lib/fluxo";
import { aplicarRevisao } from "@/lib/docx/revisar";
import {
  LETRAS_VERSAO,
  MIME_DOCX,
  gerarVersao,
  nomeArquivoVersao,
  planejarVersoes,
} from "@/lib/docx/generate";
import { supabase } from "@/integrations/supabase/client";
import { enviarArquivo, mensagemDeEnvio } from "@/lib/provas";
import { comErro, erroApp } from "@/lib/erros";
import { gerarGabaritoVersao, nomeArquivoGabarito } from "@/lib/docx/gabarito";


export const Route = createFileRoute("/_authenticated/gerar")({
  head: () => ({
    meta: [
      { title: "Gerar versões embaralhadas — EmbaralhaProvas" },
      {
        name: "description",
        content:
          "Revise as questões detectadas, escolha quantas versões quer e gere os documentos embaralhados.",
      },
      { property: "og:title", content: "Gerar versões embaralhadas — EmbaralhaProvas" },
      {
        property: "og:description",
        content: "Revisão das questões e geração de até 10 versões da prova.",
      },
    ],
  }),
  component: GerarPage,
});

function GerarPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { upload, setResultado, setUpload } = useFluxo();
  const [quantidade, setQuantidade] = useState(4);
  const [desmarcadas, setDesmarcadas] = useState<Set<number>>(new Set());
  const [gerando, setGerando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [etapa, setEtapa] = useState("");

  const analiseRevisada = useMemo(
    () => (upload ? aplicarRevisao(upload.analise, desmarcadas) : null),
    [upload, desmarcadas],
  );
  const gabaritoRevisado = useMemo(
    () => (upload?.gabarito ? aplicarRevisao(upload.gabarito.analise, desmarcadas) : null),
    [upload, desmarcadas],
  );

  if (!upload || !analiseRevisada) {
    return (
      <>
        <PageHeader titulo="Gerar versões" />
        <div className="panel p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma prova carregada. Envie um arquivo .docx para começar.
          </p>
          <Button asChild className="mt-4">
            <Link to="/upload">Ir para o upload</Link>
          </Button>
        </div>
      </>
    );
  }

  const [nomeProva, serie, turma] = upload.caminho.split("|");
  const totalValidas = analiseRevisada.questoes.length;

  function alternar(idx: number) {
    setDesmarcadas((prev) => {
      const novo = new Set(prev);
      if (novo.has(idx)) novo.delete(idx);
      else novo.add(idx);
      return novo;
    });
  }

  async function gerar() {
    if (totalValidas < 2) {
      toast.error("São necessárias pelo menos 2 questões para embaralhar.");
      return;
    }
    setGerando(true);
    setProgresso(2);
    setEtapa("Preparando o embaralhamento...");
    try {
      const userId = await comErro("Verificar sua sessão", async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const id = data.user?.id;
        if (!id) throw new Error("Sessão expirada. Entre novamente.");
        return id;
      });

      const prova = await comErro("Salvar a prova no banco de dados", async () => {
        const { data, error } = await supabase
          .from("provas")
          .insert({
            user_id: userId,
            nome: nomeProva!.trim(),
            serie: serie!.trim(),
            turma: turma!.trim(),
            quantidade_versoes: quantidade,
            total_questoes: totalValidas,
            status: "gerando",
          })
          .select()
          .single();
        if (error) throw error;
        if (!data) throw new Error("O banco de dados não retornou a prova criada.");
        return data;
      });

      const pasta = `usuarios/${userId}/${prova.id}`;

      setEtapa("Guardando o documento original...");
      // Usamos os bytes já lidos na análise (memória), não o File do disco:
      // reler o arquivo do disco pode falhar com "Failed to fetch" se o Word,
      // o OneDrive/Drive ou o próprio usuário mexeram no arquivo nesse meio-tempo.
      const originalBlob = new Blob([upload!.bytes.slice(0) as unknown as BlobPart], {
        type: MIME_DOCX,
      });
      const diagOriginal = await enviarArquivo(
        "Enviar o documento original",
        `${pasta}/original.docx`,
        originalBlob,
        MIME_DOCX,
      );
      if (!diagOriginal.ok) {
        // A análise local já funcionou: não perdemos o trabalho por causa do
        // original. Avisamos com precisão e seguimos gerando as versões.
        toast.warning(mensagemDeEnvio(diagOriginal), {
          description: `Arquivo: ${diagOriginal.caminho} · ${diagOriginal.bytes} bytes · ${diagOriginal.tentativas} tentativa(s). As versões embaralhadas continuam sendo geradas.`,
          duration: 12000,
        });
      }
      if (upload.gabarito) {
        setEtapa("Guardando o gabarito original...");
        const gabaritoOriginal = new Blob([upload.gabarito.bytes.slice(0) as unknown as BlobPart], { type: MIME_DOCX });
        const diagGabOriginal = await enviarArquivo(
          "Enviar o gabarito original",
          `${pasta}/gabarito_original.docx`,
          gabaritoOriginal,
          MIME_DOCX,
        );
        if (!diagGabOriginal.ok) {
          toast.warning(mensagemDeEnvio(diagGabOriginal), { description: "As versões ainda serão geradas; o gabarito original não ficou salvo." });
        }
      }
      setProgresso(10);

      const planos = planejarVersoes(analiseRevisada!, quantidade);
      const versoes = [];

      for (let i = 0; i < planos.length; i++) {
        const letra = LETRAS_VERSAO[i]!;
        setEtapa(`Montando a versão ${letra}...`);
        const { bytes } = await comErro(`Montar a versão ${letra}`, () =>
          gerarVersao(analiseRevisada!, planos[i]!, letra),
        );
        const arquivo = nomeArquivoVersao(nomeProva!, letra);
        const caminho = `${pasta}/${arquivo}`;
        const blob = new Blob([bytes as unknown as BlobPart], { type: MIME_DOCX });

        const diagVersao = await enviarArquivo(
          `Enviar o arquivo da versão ${letra}`,
          caminho,
          blob,
          MIME_DOCX,
        );
        if (!diagVersao.ok) throw new Error(mensagemDeEnvio(diagVersao));

        let gabaritoGerado: { arquivo: string; caminho: string; blob: Blob; url: string } | undefined;
        if (gabaritoRevisado) {
          setEtapa(`Montando o gabarito da versão ${letra}...`);
          const bytesGab = await comErro(`Montar o gabarito da versão ${letra}`, () =>
            gerarGabaritoVersao(gabaritoRevisado, analiseRevisada!, planos[i]!, letra),
          );
          const arquivoGab = nomeArquivoGabarito(letra);
          const caminhoGab = `${pasta}/${arquivoGab}`;
          const blobGab = new Blob([bytesGab as unknown as BlobPart], { type: MIME_DOCX });
          const diagGab = await enviarArquivo(`Enviar o gabarito da versão ${letra}`, caminhoGab, blobGab, MIME_DOCX);
          if (!diagGab.ok) throw new Error(mensagemDeEnvio(diagGab));
          gabaritoGerado = { arquivo: arquivoGab, caminho: caminhoGab, blob: blobGab, url: URL.createObjectURL(blobGab) };
        }

        await comErro(`Registrar a versão ${letra}`, async () => {
          const { error } = await supabase.from("versoes").insert({
            prova_id: prova.id,
            user_id: userId,
            nome: `Versão ${letra}`,
            numero: i + 1,
            arquivo: caminho,
          });
          if (error) throw error;
        });

        versoes.push({
          letra,
          nome: `Versão ${letra}`,
          arquivo,
          caminho,
          blob,
          url: URL.createObjectURL(blob),
          gabarito: gabaritoGerado,
        });
        setProgresso(10 + Math.round(((i + 1) / planos.length) * 88));
      }

      await comErro("Concluir a prova", async () => {
        const { error } = await supabase
          .from("provas")
          .update({ status: "pronta" })
          .eq("id", prova.id);
        if (error) throw error;
      });

      setProgresso(100);
      setResultado({
        provaId: prova.id,
        nome: nomeProva!.trim(),
        serie: serie!.trim(),
        turma: turma!.trim(),
        versoes,
      });
      setUpload(null);
      queryClient.invalidateQueries();
      toast.success(upload.gabarito ? `${quantidade} versões e gabaritos gerados com sucesso!` : `${quantidade} versões geradas com sucesso!`);
      navigate({ to: "/resultados" });
    } catch (err) {
      const detalhado = erroApp("Gerar as versões", err);
      toast.error(detalhado.message, { description: detalhado.detalhe });
    } finally {
      setGerando(false);
    }
  }


  return (
    <>
      <PageHeader
        titulo="Gerar versões"
        descricao={`${nomeProva} · ${serie} · ${turma}`}
      />

      {gerando ? (
        <div className="panel p-8 text-center">
          <Wand2 className="mx-auto size-8 animate-pulse text-primary" />
          <p className="mt-4 font-display text-lg font-semibold">Embaralhando sua prova</p>
          <p className="mt-1 text-sm text-muted-foreground">{etapa}</p>
          <Progress value={progresso} className="mx-auto mt-5 max-w-md" />
          <p className="mt-2 text-xs text-muted-foreground">{progresso}%</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="panel p-5 lg:col-span-2">
            <h2 className="font-display text-lg font-semibold">Diagnóstico da leitura (temporário)</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
              {[
                ["Questões encontradas", upload.analise.diagnostico.questoes],
                ["Textos de apoio", upload.analise.diagnostico.textosApoio],
                ["Questões independentes", upload.analise.diagnostico.independentes],
                ["Imagens", upload.analise.diagnostico.imagens],
                ["Tabelas", upload.analise.diagnostico.tabelas],
              ].map(([rotulo, valor]) => (
                <div key={String(rotulo)} className="rounded-lg border border-border/70 bg-card/60 p-3">
                  <dt className="text-xs text-muted-foreground">{rotulo}</dt>
                  <dd className="font-display text-xl font-semibold">{valor}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="panel p-5">

            <h2 className="font-display text-lg font-semibold">Revisão das questões</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Desmarque o que não for uma questão de verdade. O conteúdo desmarcado é mantido junto
              da questão anterior, sem perder nada.
            </p>
            <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {upload.analise.questoes.map((q, idx) => {
                const ativa = !desmarcadas.has(idx);
                return (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-lg border border-border/70 bg-card/60 p-3"
                  >
                    <Checkbox
                      id={`q-${idx}`}
                      checked={ativa}
                      onCheckedChange={() => alternar(idx)}
                      className="mt-0.5"
                    />
                    <Label htmlFor={`q-${idx}`} className="block cursor-pointer font-normal">
                      <span className="text-sm font-semibold text-primary">
                        {q.rotuloOriginal.trim() || `${q.numeroOriginal}.`}
                      </span>{" "}
                      <span className="text-sm text-muted-foreground">{q.preview}</span>
                      <span className="mt-1 block text-xs text-muted-foreground/80">
                        {q.alternativas.length
                          ? `${q.alternativas.length} alternativas detectadas`
                          : "questão sem alternativas (dissertativa)"}
                      </span>
                    </Label>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="panel h-fit space-y-5 p-5">
            <div>
              <h2 className="font-display text-lg font-semibold">Quantidade de versões</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha de 1 a 10 versões diferentes, identificadas de A até J.
              </p>
              <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuantidade(n)}
                    className={
                      "rounded-lg border py-2 text-sm font-semibold transition-colors " +
                      (quantidade === n
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground")
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Questões que serão embaralhadas</dt>
                <dd className="font-semibold">{totalValidas}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Versões</dt>
                <dd className="font-semibold">{quantidade}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Correção</dt>
                <dd className="font-semibold">{upload.gabarito ? "Gabarito automático" : "Manual"}</dd>
              </div>
            </dl>

            <Button className="w-full" size="lg" onClick={gerar}>
              <Shuffle className="size-4" /> Gerar {quantidade} versões
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/upload">Trocar de arquivo</Link>
            </Button>
          </section>
        </div>
      )}
    </>
  );
}
