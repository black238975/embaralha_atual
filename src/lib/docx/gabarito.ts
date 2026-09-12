import JSZip from "jszip";
import type { AnaliseProva, Questao } from "./analyze";
import type { PlanoVersao } from "./generate";
import { MIME_DOCX, marcadorVersaoXml, trocarPrefixo, validarDocumentXml, validarDocx } from "./generate";

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

type Peca = { indice: number; xml: string };

function novoRotuloQuestao(original: string, numero: number) {
  const m = /\d+/.exec(original);
  if (!m) return `${numero}. `;
  const largura = m[0].length;
  const texto = m[0].startsWith("0") && largura > 1 ? String(numero).padStart(largura, "0") : String(numero);
  return original.replace(/\d+/, texto);
}

function mapaLetras(ordem: number[]) {
  const mapa = new Map<string, string>();
  ordem.forEach((indiceOriginal, novaPosicao) => {
    const antiga = LETRAS[indiceOriginal];
    const nova = LETRAS[novaPosicao];
    if (antiga && nova) mapa.set(antiga, nova);
  });
  return mapa;
}

function remapearTextoResposta(texto: string, ordemAlt: number[], ordemVf: number[]) {
  let saida = texto;
  const mapa = mapaLetras(ordemAlt);

  // Respostas objetivas: "C", "Resposta: C", "Gabarito - D".
  const t = saida.trim();
  if (/^[A-Z]$/i.test(t)) {
    const nova = mapa.get(t.toUpperCase());
    if (nova) saida = saida.replace(t, t === t.toLowerCase() ? nova.toLowerCase() : nova);
  }
  saida = saida.replace(/\b(Resposta|Gabarito)(\s*[:=\-]\s*)([A-Z])\b/gi, (m, rot, sep, letra) => {
    const nova = mapa.get(String(letra).toUpperCase());
    if (!nova) return m;
    return `${rot}${sep}${String(letra) === String(letra).toLowerCase() ? nova.toLowerCase() : nova}`;
  });

  // Associação em formatos comuns: 1-A, 2=C, 3) B.
  saida = saida.replace(/(\b\d+\s*[-=:)\.]\s*)([A-Z])\b/gi, (m, pref, letra) => {
    const nova = mapa.get(String(letra).toUpperCase());
    return nova ? `${pref}${nova}` : m;
  });

  // Sequências V/F acompanham a ordem das afirmações quando ela foi embaralhada.
  if (ordemVf.length >= 2) {
    const matches = [...saida.matchAll(/\b([VF])\b/gi)];
    if (matches.length === ordemVf.length) {
      const valores = matches.map((m) => m[1]!);
      const reordenados = ordemVf.map((i) => valores[i] ?? valores[0]!);
      let pos = 0;
      saida = saida.replace(/\b([VF])\b/gi, () => reordenados[pos++]!);
    }
  }
  return saida;
}

function remapearXml(xml: string, ordemAlt: number[], ordemVf: number[]) {
  return xml.replace(/(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g, (_m, a, conteudo, f) =>
    a + remapearTextoResposta(conteudo, ordemAlt, ordemVf) + f,
  );
}

function pecasQuestao(
  analise: AnaliseProva,
  q: Questao,
  novoNumero: number,
  ordemAltProva: number[],
  ordemVfProva: number[],
): Peca[] {
  const pecas: Peca[] = [];
  const bloco = (indice: number, xml = analise.blocos[indice]!.xml): Peca => ({ indice, xml });

  // 1) Enunciado/cabeçalho da resposta permanece junto da questão.
  q.corpo.forEach((indice, pos) => {
    let xml = analise.blocos[indice]!.xml;
    if (pos === 0 && !q.numeracaoAuto && q.rotuloOriginal.trim()) {
      xml = trocarPrefixo(xml, q.rotuloOriginal, novoRotuloQuestao(q.rotuloOriginal, novoNumero));
    }
    xml = remapearXml(xml, ordemAltProva, ordemVfProva);
    pecas.push(bloco(indice, xml));
  });

  // 2) Se o gabarito possui afirmações V/F estruturadas, elas precisam seguir
  // exatamente a MESMA permutação aplicada às afirmações da prova.
  if (q.afirmacoes.length >= 2 && ordemVfProva.length === q.afirmacoes.length) {
    ordemVfProva.forEach((orig) => {
      q.afirmacoes[orig]!.indices.forEach((indice) => {
        const xml = remapearXml(analise.blocos[indice]!.xml, ordemAltProva, ordemVfProva);
        pecas.push(bloco(indice, xml));
      });
    });
  } else {
    q.afirmacoes.forEach((af) =>
      af.indices.forEach((indice) => {
        const xml = remapearXml(analise.blocos[indice]!.xml, ordemAltProva, ordemVfProva);
        pecas.push(bloco(indice, xml));
      }),
    );
  }

  // 3) Itens a), b), c)... de respostas classificatórias/abertas também são
  // blocos estruturados. Quando a prova embaralha esses itens, o gabarito deve
  // usar a MESMA ordem e renumerá-los pelas novas letras.
  // Ex.: se a prova vira "a) irrespirável ... g) espedaçar", o gabarito
  // também vira "a) irrespirável – derivação prefixal ... g) espedaçar ...".
  if (q.alternativas.length >= 2 && ordemAltProva.length === q.alternativas.length) {
    ordemAltProva.forEach((orig, novaPosicao) => {
      const alt = q.alternativas[orig]!;
      const novaLetra = LETRAS[novaPosicao] ?? alt.letra;
      alt.indices.forEach((indice, k) => {
        let xml = analise.blocos[indice]!.xml;
        if (k === 0 && alt.rotulo.trim()) {
          const m = /[A-Za-z]/.exec(alt.rotulo);
          const maiuscula = m ? m[0] === m[0].toUpperCase() : false;
          const rotuloNovo = alt.rotulo.replace(
            /[A-Za-z]/,
            maiuscula ? novaLetra.toUpperCase() : novaLetra.toLowerCase(),
          );
          xml = trocarPrefixo(xml, alt.rotulo, rotuloNovo);
        }
        // Não remapeamos novamente a letra inicial aqui: ela já foi definida
        // pela posição nova acima. Só atualizamos referências internas.
        xml = remapearXml(xml, ordemAltProva, ordemVfProva);
        pecas.push(bloco(indice, xml));
      });
    });
  } else {
    q.alternativas.forEach((alt) =>
      alt.indices.forEach((indice) => {
        const xml = remapearXml(analise.blocos[indice]!.xml, ordemAltProva, ordemVfProva);
        pecas.push(bloco(indice, xml));
      }),
    );
  }

  // 4) Rodapé/observações finais ficam no final do bloco da questão.
  q.rodape.forEach((indice) => {
    const xml = remapearXml(analise.blocos[indice]!.xml, ordemAltProva, ordemVfProva);
    pecas.push(bloco(indice, xml));
  });

  return pecas;
}

/**
 * Gera o gabarito correspondente ao mesmo plano usado na prova.
 * A correspondência é por posição original: questão 1 do gabarito pertence à
 * questão 1 da prova, inclusive em respostas abertas/lacunas/associação.
 */
export async function gerarGabaritoVersao(
  gabarito: AnaliseProva,
  prova: AnaliseProva,
  plano: PlanoVersao,
  letraVersao?: string,
): Promise<Uint8Array> {
  if (gabarito.questoes.length !== prova.questoes.length) {
    throw new Error(`O gabarito tem ${gabarito.questoes.length} questões, mas a prova tem ${prova.questoes.length}.`);
  }

  const pecas: Peca[] = gabarito.cabecalho.map((i) => ({ indice: i, xml: gabarito.blocos[i]!.xml }));
  const ordem = plano.ordemQuestoesPorContexto.flat();
  const contextoPorQuestao = new Map<number, number>();
  gabarito.contextos.forEach((c, ctxIdx) => c.questoes.forEach((qIdx) => contextoPorQuestao.set(qIdx, ctxIdx)));
  const apoiosEmitidos = new Set<number>();

  // Descobre as seções de numeração na ordem ORIGINAL da prova.
  // Não podemos reiniciar a numeração olhando a ordem embaralhada: se a
  // questão original 1 cair no meio da versão, isso faria o gabarito voltar
  // para 1. Cada seção mantém seu próprio contador, igual à prova gerada.
  const secaoPorQuestao = new Map<number, number>();
  let secao = 0;
  let numeroOriginalAnterior: number | null = null;
  prova.questoes.forEach((q, idx) => {
    if (numeroOriginalAnterior !== null && q.numeroOriginal === 1 && numeroOriginalAnterior > 1) secao++;
    secaoPorQuestao.set(idx, secao);
    numeroOriginalAnterior = q.numeroOriginal;
  });
  const contadorPorSecao = new Map<number, number>();

  for (const idx of ordem) {
    const ctxIdx = contextoPorQuestao.get(idx);
    if (ctxIdx !== undefined && !apoiosEmitidos.has(ctxIdx)) {
      const ctx = gabarito.contextos[ctxIdx];
      ctx?.apoio.forEach((i) => pecas.push({ indice: i, xml: gabarito.blocos[i]!.xml }));
      apoiosEmitidos.add(ctxIdx);
    }
    const qGab = gabarito.questoes[idx]!;
    const secaoQuestao = secaoPorQuestao.get(idx) ?? 0;
    const novoNumero = (contadorPorSecao.get(secaoQuestao) ?? 0) + 1;
    contadorPorSecao.set(secaoQuestao, novoNumero);
    pecas.push(...pecasQuestao(
      gabarito,
      qGab,
      novoNumero,
      plano.ordemAlternativas[idx] ?? [],
      plano.ordemAfirmacoes[idx] ?? [],
    ));
  }

  // Mantém qualquer finalização do gabarito no fim, sem deixá-la viajar com
  // a última questão durante o embaralhamento.
  gabarito.finalizacao.forEach((i) => pecas.push({ indice: i, xml: gabarito.blocos[i]!.xml }));

  const marcador = letraVersao ? marcadorVersaoXml(letraVersao, true) : "";
  const corpo = marcador + pecas.map((p) => p.xml).join("") + gabarito.sectPr;
  const xml = gabarito.prefixo + corpo + gabarito.sufixo;
  const erroXml = validarDocumentXml(xml);
  if (erroXml) throw new Error(`XML do gabarito inválido: ${erroXml}`);

  const zip = await JSZip.loadAsync(gabarito.bytes.slice(0));
  zip.file("word/document.xml", xml);
  const bytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: MIME_DOCX,
  });
  const erroZip = await validarDocx(bytes);
  if (erroZip) throw new Error(`DOCX do gabarito inválido: ${erroZip}`);
  return bytes;
}

export function nomeArquivoGabarito(letra: string) {
  return `Gabarito_Versao_${letra}.docx`;
}
