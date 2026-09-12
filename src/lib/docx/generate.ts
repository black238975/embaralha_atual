import JSZip from "jszip";
import { ehBlocoDeCorpo, type AnaliseProva, type Questao } from "./analyze";

/* ------------------------------------------------------------------ */
/* Shuffle Engine (Fisher-Yates)                                       */
/* ------------------------------------------------------------------ */

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

function embaralhar<T>(arr: T[], rand: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = out[i]!;
    const b = out[j]!;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/** Em contextos cujo texto-base começa dentro da primeira questão, mantém
 * essa questão-âncora no topo e embaralha somente as dependentes seguintes. */
function embaralharQuestoesDoContexto(
  questoes: number[],
  fixaPrimeira: boolean | undefined,
  rand: () => number,
  ativo: boolean,
) {
  if (!ativo || questoes.length <= 1) return questoes.slice();
  if (fixaPrimeira) return [questoes[0]!, ...embaralhar(questoes.slice(1), rand)];
  return embaralhar(questoes, rand);
}

export type PlanoVersao = {
  /** ordem dos contextos — SEMPRE a original: textos de apoio são âncoras fixas */
  ordemContextos: number[];
  /** para cada contexto, a ordem das suas questões (índices em analise.questoes) */
  ordemQuestoesPorContexto: number[][];
  ordemAlternativas: number[][];
  ordemAfirmacoes: number[][];
};

export type OpcoesEmbaralhamento = {
  questoes: boolean;
  alternativas: boolean;
};

export function planejarVersoes(
  analise: AnaliseProva,
  quantidade: number,
  opcoes: OpcoesEmbaralhamento = { questoes: true, alternativas: true },
): PlanoVersao[] {
  const contextos = analise.contextos;
  // âncora fixa: a ordem dos blocos de apoio nunca muda
  const ordemContextos = contextos.map((_, i) => i);
  const planos: PlanoVersao[] = [];
  const usadas = new Set<string>();
  const baseSeed = Date.now();

  const assinaturaPlano = (
    ordemQuestoesPorContexto: number[][],
    ordemAlternativas: number[][],
    ordemAfirmacoes: number[][],
  ) =>
    [
      ordemQuestoesPorContexto.map((o) => o.join(",")).join(";"),
      ordemAlternativas.map((o) => o.join(",")).join(";"),
      ordemAfirmacoes.map((o) => o.join(",")).join(";"),
    ].join("|");

  for (let v = 0; v < quantidade; v++) {
    let escolhido: PlanoVersao | null = null;

    // A assinatura considera questões + alternativas + afirmações V/F.
    // Isso permite criar até 10 versões realmente diferentes sempre que
    // a prova tiver combinações suficientes para isso.
    for (let tentativas = 0; tentativas < 500; tentativas++) {
      const seed = baseSeed + v * 7919 + tentativas * 104729;
      const randQuestoes = rng(seed);
      const ordemQuestoesPorContexto = contextos.map((c) =>
        embaralharQuestoesDoContexto(c.questoes, c.fixaPrimeira, randQuestoes, opcoes.questoes),
      );

      const randAlt = rng(seed + 31337);
      const ordemAlternativas = analise.questoes.map((q) => {
        const idx = q.alternativas.map((_, i) => i);
        return opcoes.alternativas && idx.length > 1 ? embaralhar(idx, randAlt) : idx;
      });

      const randVf = rng(seed + 15731);
      const ordemAfirmacoes = analise.questoes.map((q) => {
        const idx = q.afirmacoes.map((_, i) => i);
        return opcoes.alternativas && idx.length > 1 ? embaralhar(idx, randVf) : idx;
      });

      const assinatura = assinaturaPlano(
        ordemQuestoesPorContexto,
        ordemAlternativas,
        ordemAfirmacoes,
      );

      if (!usadas.has(assinatura)) {
        usadas.add(assinatura);
        escolhido = {
          ordemContextos: ordemContextos.slice(),
          ordemQuestoesPorContexto,
          ordemAlternativas,
          ordemAfirmacoes,
        };
        break;
      }
    }

    // Em provas extremamente pequenas pode ser matematicamente impossível
    // produzir 10 combinações únicas. Mantemos a geração funcionando, mas
    // usamos uma nova semente como fallback.
    if (!escolhido) {
      const seed = baseSeed + v * 99991 + 23;
      const randQuestoes = rng(seed);
      const randAlt = rng(seed + 31337);
      const randVf = rng(seed + 15731);
      escolhido = {
        ordemContextos: ordemContextos.slice(),
        ordemQuestoesPorContexto: contextos.map((c) =>
          embaralharQuestoesDoContexto(c.questoes, c.fixaPrimeira, randQuestoes, opcoes.questoes),
        ),
        ordemAlternativas: analise.questoes.map((q) => {
          const idx = q.alternativas.map((_, i) => i);
          return opcoes.alternativas && idx.length > 1 ? embaralhar(idx, randAlt) : idx;
        }),
        ordemAfirmacoes: analise.questoes.map((q) => {
          const idx = q.afirmacoes.map((_, i) => i);
          return opcoes.alternativas && idx.length > 1 ? embaralhar(idx, randVf) : idx;
        }),
      };
    }

    planos.push(escolhido);
  }
  return planos;
}

/* ------------------------------------------------------------------ */
/* Reescrita de rótulos preservando a formatação do run                */
/* ------------------------------------------------------------------ */

/**
 * Substitui o rótulo original (ex.: "1. ", "Questão 3 - ", "a) ") pelo novo,
 * mantendo runs, fontes e formatação. Espaços iniciais são preservados.
 */
export function trocarPrefixo(xml: string, rotuloOriginal: string, novo: string) {
  const alvo = rotuloOriginal.trim();
  const novoTexto = novo.trim() + (/\s$/.test(rotuloOriginal) ? " " : "");
  let pularBrancos = true;
  let restante = alvo.length;
  let inserido = false;

  return xml.replace(
    /(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g,
    (m, abre: string, conteudo: string, fecha: string) => {
      if (inserido && restante <= 0) return m;
      let i = 0;
      let saida = "";
      if (pularBrancos) {
        while (i < conteudo.length && /\s/.test(conteudo[i]!)) {
          saida += conteudo[i];
          i++;
        }
        if (i < conteudo.length) pularBrancos = false;
      }
      const consumir = Math.min(restante, conteudo.length - i);
      i += consumir;
      restante -= consumir;
      if (!inserido && !pularBrancos) {
        saida += novoTexto;
        inserido = true;
      }
      saida += conteudo.slice(i);
      const abreOk = /xml:space=/.test(abre) ? abre : abre.replace(/>$/, ' xml:space="preserve">');
      return abreOk + saida + fecha;
    },
  );
}

function novoRotuloQuestao(original: string, numero: number) {
  const m = /\d+/.exec(original);
  if (!m) return `${numero}. `;
  const largura = m[0].length;
  const texto =
    m[0].startsWith("0") && largura > 1 ? String(numero).padStart(largura, "0") : String(numero);
  return original.replace(/\d+/, texto);
}

function novoRotuloAlternativa(original: string, letra: string) {
  const m = /[A-Za-z]/.exec(original);
  if (!m) return `${letra}) `;
  const maiuscula = m[0] === m[0].toUpperCase();
  return original.replace(/[A-Za-z]/, maiuscula ? letra.toUpperCase() : letra.toLowerCase());
}

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function escaparXml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Parágrafo visível no topo do DOCX para identificar a versão impressa. */
export function marcadorVersaoXml(letra: string, gabarito = false) {
  const texto = escaparXml(`${gabarito ? "GABARITO — " : ""}VERSÃO ${letra.toUpperCase()}`);
  return `<w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${texto}</w:t></w:r></w:p>`;
}

/* ------------------------------------------------------------------ */
/* Montagem                                                            */
/* ------------------------------------------------------------------ */

type Peca = { indice: number; xml: string; questaoId?: string; contextoId?: string };

function montarQuestaoXml(
  analise: AnaliseProva,
  q: Questao,
  novoNumero: number,
  ordemAlt: number[],
  ordemVf: number[],
  contextoId: string,
): Peca[] {
  const pecas: Peca[] = [];
  const bloco = (i: number): Peca => ({
    indice: i,
    xml: analise.blocos[i]!.xml,
    questaoId: q.id,
    contextoId,
  });

  q.corpo.forEach((i, pos) => {
    // numeração automática do Word: o número não está no texto — o próprio
    // Word renumera a lista, então o parágrafo é copiado sem alteração.
    if (pos === 0 && !q.numeracaoAuto && q.rotuloOriginal.trim()) {
      const novo = novoRotuloQuestao(q.rotuloOriginal, novoNumero);
      pecas.push({
        indice: i,
        xml: trocarPrefixo(analise.blocos[i]!.xml, q.rotuloOriginal, novo),
        questaoId: q.id,
        contextoId,
      });
    } else {
      pecas.push(bloco(i));
    }
  });

  if (q.afirmacoes.length >= 2 && ordemVf.length === q.afirmacoes.length) {
    ordemVf.forEach((orig) => {
      q.afirmacoes[orig]!.indices.forEach((i) => pecas.push(bloco(i)));
    });
  } else {
    q.afirmacoes.forEach((a) => a.indices.forEach((i) => pecas.push(bloco(i))));
  }

  if (q.alternativas.length >= 2 && ordemAlt.length === q.alternativas.length) {
    ordemAlt.forEach((orig, pos) => {
      const alt = q.alternativas[orig]!;
      const letra = LETRAS[pos] ?? alt.letra;
      alt.indices.forEach((i, k) => {
        if (k === 0 && alt.rotulo.trim()) {
          pecas.push({
            indice: i,
            xml: trocarPrefixo(
              analise.blocos[i]!.xml,
              alt.rotulo,
              novoRotuloAlternativa(alt.rotulo, letra),
            ),
            questaoId: q.id,
            contextoId,
          });
        } else pecas.push(bloco(i));
      });
    });
  } else {
    q.alternativas.forEach((a) => a.indices.forEach((i) => pecas.push(bloco(i))));
  }

  q.rodape.forEach((i) => pecas.push(bloco(i)));
  return pecas;
}

/* ------------------------------------------------------------------ */
/* Validation Engine                                                   */
/* ------------------------------------------------------------------ */

export type Validacao = { ok: boolean; problemas: string[] };

/* ------------------------------------------------------------------ */
/* Validação estrutural do XML e do pacote DOCX                        */
/* ------------------------------------------------------------------ */

/**
 * Confere que o XML final está bem-formado (tags balanceadas) e que
 * <w:body> só contém elementos permitidos. Devolve null quando está OK.
 */
export function validarDocumentXml(xml: string): string | null {
  if (!xml.startsWith("<?xml")) return "declaração XML ausente";
  if (!/<w:document[\s>]/.test(xml)) return "elemento w:document ausente";
  if (xml.indexOf("<w:body") < 0 || xml.indexOf("</w:body>") < 0) return "w:body incompleto";
  if (!xml.trimEnd().endsWith("</w:document>")) return "XML truncado no final";

  const pilha: string[] = [];
  const re = /<(\/?)([A-Za-z_][\w.:-]*)([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const nome = m[2]!;
    if (nome.startsWith("?") || nome.startsWith("!")) continue;
    const attrs = m[3] ?? "";
    if (m[1] === "/") {
      const aberta = pilha.pop();
      if (aberta !== nome) return `</${nome}> fecha <${aberta ?? "nada"}>`;
    } else if (!attrs.trimEnd().endsWith("/")) {
      pilha.push(nome);
    }
  }
  if (pilha.length) return `tags sem fechamento: ${pilha.slice(0, 3).join(", ")}`;

  // filhos diretos de <w:body>
  const ini = xml.indexOf(">", xml.indexOf("<w:body")) + 1;
  const corpo = xml.slice(ini, xml.lastIndexOf("</w:body>"));
  for (const el of dividirFilhos(corpo)) {
    if (!ehBlocoDeCorpo(el)) return `elemento inválido dentro de w:body: <${nomeDaTag(el)}>`;
  }
  return null;
}

function nomeDaTag(el: string) {
  return el.slice(1).split(/[\s/>]/)[0] ?? "";
}

/** Divide os filhos diretos de um trecho XML (versão leve, só para validar). */
function dividirFilhos(interno: string): string[] {
  const saida: string[] = [];
  const re = /<(\/?)([A-Za-z_][\w.:-]*)([^>]*)>/g;
  let profundidade = 0;
  let inicio = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(interno))) {
    const attrs = m[3] ?? "";
    const auto = attrs.trimEnd().endsWith("/");
    if (m[1] === "/") {
      profundidade--;
      if (profundidade === 0 && inicio >= 0) {
        saida.push(interno.slice(inicio, m.index + m[0].length));
        inicio = -1;
      }
    } else {
      if (profundidade === 0) {
        if (auto) {
          saida.push(m[0]);
          continue;
        }
        inicio = m.index;
      }
      if (!auto) profundidade++;
    }
  }
  return saida;
}

/** Reabre o pacote gerado e confere as partes obrigatórias de um DOCX. */
export async function validarDocx(bytes: Uint8Array): Promise<string | null> {
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b)) return "arquivo não é um ZIP válido";
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch (e) {
    return `não foi possível abrir o ZIP (${(e as Error).message})`;
  }
  const obrigatorios = [
    "[Content_Types].xml",
    "_rels/.rels",
    "word/document.xml",
    "word/_rels/document.xml.rels",
  ];
  for (const nome of obrigatorios) {
    if (!zip.file(nome)) return `parte obrigatória ausente: ${nome}`;
  }
  const doc = await zip.file("word/document.xml")!.async("string");
  return validarDocumentXml(doc);
}


export function validarVersao(analise: AnaliseProva, pecas: Peca[]): Validacao {
  const problemas: string[] = [];

  /* 1-3: todos os blocos originais presentes uma única vez ------------- */
  const esperados = new Set<number>(analise.cabecalho);
  for (const c of analise.contextos) c.apoio.forEach((i) => esperados.add(i));
  analise.finalizacao.forEach((i) => esperados.add(i));
  for (const q of analise.questoes) {
    q.corpo.forEach((i) => esperados.add(i));
    q.afirmacoes.forEach((a) => a.indices.forEach((i) => esperados.add(i)));
    q.alternativas.forEach((a) => a.indices.forEach((i) => esperados.add(i)));
    q.rodape.forEach((i) => esperados.add(i));
  }
  const vistos = new Map<number, number>();
  for (const p of pecas) vistos.set(p.indice, (vistos.get(p.indice) ?? 0) + 1);
  for (const [i, n] of vistos) if (n > 1) problemas.push(`Bloco ${i} duplicado.`);
  for (const i of esperados) if (!vistos.has(i)) problemas.push(`Bloco ${i} perdido.`);

  /* 4: cada questionId aparece exatamente uma vez ---------------------- */
  const ordemQuestoes: string[] = [];
  const grupoDaPeca = new Map<string, string>();
  pecas.forEach((p) => {
    if (!p.questaoId) return;
    if (ordemQuestoes[ordemQuestoes.length - 1] !== p.questaoId) ordemQuestoes.push(p.questaoId);
    grupoDaPeca.set(p.questaoId, p.contextoId ?? "");
  });
  const contagem = new Map<string, number>();
  ordemQuestoes.forEach((id) => contagem.set(id, (contagem.get(id) ?? 0) + 1));
  for (const [id, n] of contagem) if (n > 1) problemas.push(`Questão ${id} aparece ${n} vezes.`);
  for (const q of analise.questoes)
    if (!contagem.has(q.id)) problemas.push(`Questão ${q.id} ausente na versão.`);
  if (ordemQuestoes.length !== analise.questoes.length)
    problemas.push(
      `Quantidade de questões diferente da original (${ordemQuestoes.length} × ${analise.questoes.length}).`,
    );

  /* 5-9 + 14-15: cada questão ficou no grupo correto ------------------- */
  const grupoOriginal = new Map<string, string>();
  analise.contextos.forEach((c) =>
    c.questoes.forEach((i) => grupoOriginal.set(analise.questoes[i]!.id, c.id)),
  );
  for (const [id, grupo] of grupoDaPeca) {
    const esperado = grupoOriginal.get(id);
    if (esperado && grupo !== esperado)
      problemas.push(`Questão ${id} saiu do grupo ${esperado} para ${grupo}.`);
  }

  /* 10-13: textos de apoio presentes, únicos e na mesma posição -------- */
  const apoioNaVersao: string[] = [];
  pecas.forEach((p) => {
    for (const c of analise.contextos) {
      if (c.apoio.includes(p.indice) && apoioNaVersao[apoioNaVersao.length - 1] !== c.id)
        apoioNaVersao.push(c.id);
    }
  });
  const apoioOriginal = analise.contextos.filter((c) => c.apoio.length).map((c) => c.id);
  if (apoioNaVersao.join("|") !== apoioOriginal.join("|"))
    problemas.push("Texto de apoio mudou de posição, duplicou ou desapareceu.");

  return { ok: problemas.length === 0, problemas };
}

export async function gerarVersao(
  analise: AnaliseProva,
  plano: PlanoVersao,
  letraVersao?: string,
): Promise<{ bytes: Uint8Array; validacao: Validacao }> {
  const pecas: Peca[] = analise.cabecalho.map((i) => ({ indice: i, xml: analise.blocos[i]!.xml }));

  // Descobre as seções de numeração na ordem ORIGINAL. Assim uma prova com
  // disciplinas numeradas 1..10 / 1..10 mantém cada disciplina começando em 1,
  // mesmo que as questões sejam embaralhadas dentro de seus contextos.
  const secaoPorQuestao = new Map<number, number>();
  let secao = 0;
  let numeroOriginalAnterior: number | null = null;
  analise.questoes.forEach((q, idx) => {
    if (numeroOriginalAnterior !== null && q.numeroOriginal === 1 && numeroOriginalAnterior > 1) secao++;
    secaoPorQuestao.set(idx, secao);
    numeroOriginalAnterior = q.numeroOriginal;
  });
  const contadorPorSecao = new Map<number, number>();
  let totalQuestoes = 0;

  // textos de apoio permanecem nas suas posições originais
  analise.contextos.forEach((contexto, ctxIdx) => {
    contexto.apoio.forEach((i) => pecas.push({ indice: i, xml: analise.blocos[i]!.xml }));

    const ordem = plano.ordemQuestoesPorContexto[ctxIdx] ?? contexto.questoes;
    ordem.forEach((idx) => {
      const q = analise.questoes[idx];
      if (!q) return;
      const secaoQuestao = secaoPorQuestao.get(idx) ?? 0;
      const novoNumero = (contadorPorSecao.get(secaoQuestao) ?? 0) + 1;
      contadorPorSecao.set(secaoQuestao, novoNumero);
      totalQuestoes++;
      pecas.push(
        ...montarQuestaoXml(
          analise,
          q,
          novoNumero,
          plano.ordemAlternativas[idx] ?? [],
          plano.ordemAfirmacoes[idx] ?? [],
          contexto.id,
        ),
      );
    });
  });

  // Finalizações (ex.: “BOA SORTE”) fazem parte do documento e precisam estar
  // presentes ANTES da validação. Elas continuam sendo adicionadas somente
  // depois de todas as questões, mas agora o validador também consegue vê-las
  // e não acusa falsamente “Bloco X perdido”.
  analise.finalizacao.forEach((i) => pecas.push({ indice: i, xml: analise.blocos[i]!.xml }));

  const validacao = validarVersao(analise, pecas);
  if (!validacao.ok) {
    throw new Error(`Falha na validação da versão: ${validacao.problemas.slice(0, 3).join(" ")}`);
  }

  const marcador = letraVersao ? marcadorVersaoXml(letraVersao) : "";
  const corpo = marcador + pecas.map((p) => p.xml).join("") + analise.sectPr;
  const novoXml = analise.prefixo + corpo + analise.sufixo;

  const erroXml = validarDocumentXml(novoXml);
  if (erroXml) throw new Error(`XML do documento inválido: ${erroXml}`);

  // reempacota o ZIP original (mídia, estilos, headers, rels, numbering intactos)
  const zip = await JSZip.loadAsync(analise.bytes.slice(0));
  zip.file("word/document.xml", novoXml);
  const bytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: MIME_DOCX,
  });

  const erroZip = await validarDocx(bytes);
  if (erroZip) throw new Error(`DOCX gerado inválido: ${erroZip}`);


  console.info(
    `[EmbaralhaProvas] Questões originais: ${analise.questoes.length} | na versão: ${totalQuestoes} | duplicadas: 0 | ausentes: 0 | textos: ${analise.contextos.filter((c) => c.apoio.length).length} | textos movidos: 0`,
  );

  return { bytes, validacao };
}

export const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function rotuloVersao(indice: number) {
  let n = indice + 1;
  let rotulo = "";
  while (n > 0) {
    n--;
    rotulo = String.fromCharCode(65 + (n % 26)) + rotulo;
    n = Math.floor(n / 26);
  }
  return rotulo;
}

/** Máximo atual do produto: 10 versões (A-J). */
export const LETRAS_VERSAO = Array.from({ length: 10 }, (_, i) => rotuloVersao(i));

function limpar(nome: string) {
  return (
    nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "Prova"
  );
}

export function nomeArquivoVersao(nomeProva: string, letra: string) {
  return `${limpar(nomeProva)}_Versao_${letra}.docx`;
}

export function nomeArquivoZip(nomeProva: string) {
  return `${limpar(nomeProva)}.zip`;
}
