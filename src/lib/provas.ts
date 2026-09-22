import { supabase } from "@/integrations/supabase/client";
import { comErro } from "@/lib/erros";

export type Prova = {
  id: string;
  user_id: string;
  nome: string;
  serie: string;
  turma: string;
  status: string;
  quantidade_versoes: number;
  total_questoes: number;
  created_at: string;
};

export type Versao = {
  id: string;
  prova_id: string;
  nome: string;
  numero: number;
  arquivo: string;
  created_at: string;
  gabarito?: string;
};

export const BUCKET = "provas";

export async function listarProvas(): Promise<Prova[]> {
  return comErro("Carregar suas provas", async () => {
    const { data, error } = await supabase
      .from("provas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Prova[];
  });
}

export async function listarVersoes(provaId: string): Promise<Versao[]> {
  return comErro("Carregar as versões da prova", async () => {
    const { data, error } = await supabase
      .from("versoes")
      .select("*")
      .eq("prova_id", provaId)
      .order("numero", { ascending: true });
    if (error) throw error;
    const lista = (data ?? []) as Versao[];
    if (!lista.length) return lista;
    const pasta = lista[0]!.arquivo.split("/").slice(0, -1).join("/");
    const { data: arquivos } = await supabase.storage.from(BUCKET).list(pasta, { limit: 100 });
    const nomes = new Set((arquivos ?? []).map((a) => a.name));
    const letras = "ABCDEFGHIJ";
    return lista.map((v) => {
      const letra = letras[v.numero - 1];
      const nomeGab = letra ? `Gabarito_Versao_${letra}.docx` : "";
      return nomeGab && nomes.has(nomeGab) ? { ...v, gabarito: `${pasta}/${nomeGab}` } : v;
    });
  });
}

export async function contarVersoes(): Promise<number> {
  return comErro("Contar as versões geradas", async () => {
    const { count, error } = await supabase
      .from("versoes")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  });
}

export async function urlAssinada(caminho: string, segundos = 3600): Promise<string> {
  return comErro("Gerar o link do arquivo", async () => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, segundos);
    if (error) throw error;
    if (!data) throw new Error("O servidor não retornou o link do arquivo.");
    return data.signedUrl;
  });
}

export async function baixarArquivo(caminho: string): Promise<Blob> {
  return comErro("Baixar o arquivo da versão", async () => {
    const { data, error } = await supabase.storage.from(BUCKET).download(caminho);
    if (error) throw error;
    if (!data) throw new Error("O servidor não retornou o arquivo.");
    return data;
  });
}

export function salvarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function excluirVersoes(provaId: string) {
  const versoes = await listarVersoes(provaId);
  if (versoes.length) {
    const caminhos = versoes.map((v) => v.arquivo);
    await comErro("Apagar os arquivos das versões", async () => {
      const { error } = await supabase.storage.from(BUCKET).remove(caminhos);
      if (error) throw error;
    });
  }
  await comErro("Apagar os registros das versões", async () => {
    const { error } = await supabase.from("versoes").delete().eq("prova_id", provaId);
    if (error) throw error;
  });
  await comErro("Atualizar a prova", async () => {
    const { error } = await supabase
      .from("provas")
      .update({ quantidade_versoes: 0 })
      .eq("id", provaId);
    if (error) throw error;
  });
}

export async function excluirProva(provaId: string) {
  await excluirVersoes(provaId);
  await comErro("Apagar a prova", async () => {
    const { error } = await supabase.from("provas").delete().eq("id", provaId);
    if (error) throw error;
  });
}

/** Agrupa provas por série e turma para a árvore de "Minhas Provas". */
export function agruparPorSerieTurma(provas: Prova[]) {
  const mapa = new Map<string, Map<string, Prova[]>>();
  for (const p of provas) {
    const serie = p.serie || "Sem série";
    const turma = p.turma || "Sem turma";
    if (!mapa.has(serie)) mapa.set(serie, new Map());
    const turmas = mapa.get(serie)!;
    if (!turmas.has(turma)) turmas.set(turma, []);
    turmas.get(turma)!.push(p);
  }
  return Array.from(mapa.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
    .map(([serie, turmas]) => ({
      serie,
      turmas: Array.from(turmas.entries())
        .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
        .map(([turma, itens]) => ({ turma, provas: itens })),
    }));
}

/* ------------------------------------------------------------------ */
/* Envio de arquivos para o Storage com diagnóstico e retentativa      */
/* ------------------------------------------------------------------ */

const SUPABASE_URL = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;

export type DiagnosticoEnvio = {
  operacao: string;
  caminho: string;
  bytes: number;
  tentativas: number;
  url: string;
  metodo: string;
  status?: number;
  respostaServidor?: string;
  erro?: string;
  chegouAoServidor: boolean;
  ok: boolean;
};

export function urlDoObjeto(caminho: string) {
  return `${SUPABASE_URL ?? "(VITE_SUPABASE_URL ausente)"}/storage/v1/object/${BUCKET}/${caminho}`;
}

/**
 * Envia um Blob já materializado em memória (nunca um File lido do disco:
 * o arquivo pode ter sido movido/alterado pelo Word ou pela sincronização da
 * nuvem, e aí o navegador falha com "TypeError: Failed to fetch" ao reler).
 * Faz até 3 tentativas e devolve um diagnóstico detalhado da requisição.
 */
export async function enviarArquivo(
  operacao: string,
  caminho: string,
  blob: Blob,
  contentType: string,
): Promise<DiagnosticoEnvio> {
  const diag: DiagnosticoEnvio = {
    operacao,
    caminho,
    bytes: blob.size,
    tentativas: 0,
    url: urlDoObjeto(caminho),
    metodo: "POST (storage upload, upsert)",
    chegouAoServidor: false,
    ok: false,
  };

  if (!SUPABASE_URL) {
    diag.erro = "VITE_SUPABASE_URL não está disponível no frontend.";
    return diag;
  }
  if (blob.size === 0) {
    diag.erro = "O conteúdo do arquivo está vazio na memória do navegador.";
    return diag;
  }

  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    diag.tentativas = tentativa;
    try {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, blob, { contentType, upsert: true });
      if (!error) {
        diag.ok = true;
        diag.chegouAoServidor = true;
        delete diag.erro;
        delete diag.status;
        delete diag.respostaServidor;
        return diag;
      }
      const status = (error as { statusCode?: string | number; status?: number }).statusCode
        ?? (error as { status?: number }).status;
      if (status !== undefined) diag.status = Number(status);
      diag.respostaServidor = error.message;
      diag.chegouAoServidor = diag.status !== undefined && !Number.isNaN(diag.status);
      diag.erro = error.message;
      // Erros de permissão/validação não melhoram com retentativa.
      if (diag.status && diag.status < 500 && diag.status !== 429) break;
    } catch (err) {
      diag.erro = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      diag.chegouAoServidor = false;
    }
    if (tentativa < 3) await new Promise((r) => setTimeout(r, 400 * tentativa));
  }

  console.error(`[storage] ${operacao} falhou`, {
    url: diag.url,
    origem: typeof window !== "undefined" ? window.location.origin : "ssr",
    metodo: diag.metodo,
    bytes: diag.bytes,
    tentativas: diag.tentativas,
    status: diag.status ?? "sem resposta HTTP (falha de rede/CORS/DNS)",
    respostaServidor: diag.respostaServidor,
    erro: diag.erro,
    chegouAoServidor: diag.chegouAoServidor,
  });
  return diag;
}

export function mensagemDeEnvio(diag: DiagnosticoEnvio) {
  if (diag.chegouAoServidor) {
    return `${diag.operacao}: o servidor recusou o arquivo (HTTP ${diag.status}). ${diag.respostaServidor ?? ""}`.trim();
  }
  return `${diag.operacao}: a requisição não chegou ao servidor de arquivos (falha de rede, CORS ou leitura do arquivo). Detalhe: ${diag.erro ?? "desconhecido"}`;
}
