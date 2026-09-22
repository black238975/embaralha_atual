/* ------------------------------------------------------------------ */
/* Numeração automática do Word (w:numPr / w:numId / w:ilvl)           */
/* ------------------------------------------------------------------ */
/**
 * Professores costumam numerar as questões com a ferramenta de lista
 * automática do Word. Nesse caso o "1." aparece na tela, mas NÃO existe no
 * texto do parágrafo — ele é derivado de `word/numbering.xml`.
 *
 * Este módulo reconstrói o rótulo visível de cada parágrafo numerado,
 * respeitando início (w:start), reinícios, níveis (w:ilvl) e estilos de
 * lista diferentes (w:numId), inclusive quando a lista continua entre
 * páginas.
 */

export type FormatoNum = "decimal" | "letra" | "romano" | "outro";

export type MarcaNumerada = {
  numId: string;
  ilvl: number;
  /** valor sequencial calculado neste nível (1, 2, 3, ...) */
  valor: number;
  formato: FormatoNum;
  /** rótulo reconstruído, ex.: "1." / "a)" / "IV." */
  rotulo: string;
};

type Nivel = { start: number; numFmt: string; lvlText: string };
type Abstrato = Map<number, Nivel>;

export type MapaNumeracao = {
  /** numId -> níveis */
  nums: Map<string, Abstrato>;
  /** styleId -> { numId, ilvl } definido no estilo do parágrafo */
  estilos: Map<string, { numId: string; ilvl: number }>;
};

const attr = (xml: string, nome: string) => {
  const m = new RegExp(`${nome}="([^"]*)"`).exec(xml);
  return m ? m[1]! : null;
};

function lerNiveis(xmlAbstrato: string): Abstrato {
  const niveis: Abstrato = new Map();
  const re = /<w:lvl\s[^>]*w:ilvl="(\d+)"[^>]*>([\s\S]*?)<\/w:lvl>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xmlAbstrato))) {
    const ilvl = Number(m[1]);
    const corpo = m[2]!;
    niveis.set(ilvl, {
      start: Number(attr(/<w:start\b[^>]*\/?>/.exec(corpo)?.[0] ?? "", "w:val") ?? 1) || 1,
      numFmt: attr(/<w:numFmt\b[^>]*\/?>/.exec(corpo)?.[0] ?? "", "w:val") ?? "decimal",
      lvlText: attr(/<w:lvlText\b[^>]*\/?>/.exec(corpo)?.[0] ?? "", "w:val") ?? "%1.",
    });
  }
  return niveis;
}

/** Lê numbering.xml + styles.xml e devolve o mapa de listas do documento. */
export function lerMapaNumeracao(numberingXml: string, stylesXml: string): MapaNumeracao {
  const abstratos = new Map<string, Abstrato>();
  const reAbs = /<w:abstractNum\s[^>]*w:abstractNumId="([^"]+)"[^>]*>([\s\S]*?)<\/w:abstractNum>/g;
  let m: RegExpExecArray | null;
  while ((m = reAbs.exec(numberingXml))) abstratos.set(m[1]!, lerNiveis(m[2]!));

  const nums = new Map<string, Abstrato>();
  const reNum = /<w:num\s[^>]*w:numId="([^"]+)"[^>]*>([\s\S]*?)<\/w:num>/g;
  while ((m = reNum.exec(numberingXml))) {
    const numId = m[1]!;
    const corpo = m[2]!;
    const absId = attr(/<w:abstractNumId\b[^>]*\/?>/.exec(corpo)?.[0] ?? "", "w:val");
    const base = (absId && abstratos.get(absId)) || new Map<number, Nivel>();
    // cópia + overrides (w:lvlOverride / w:startOverride)
    const niveis: Abstrato = new Map([...base].map(([k, v]) => [k, { ...v }]));
    const reOv = /<w:lvlOverride\s[^>]*w:ilvl="(\d+)"[^>]*>([\s\S]*?)<\/w:lvlOverride>/g;
    let o: RegExpExecArray | null;
    while ((o = reOv.exec(corpo))) {
      const ilvl = Number(o[1]);
      const inicio = attr(/<w:startOverride\b[^>]*\/?>/.exec(o[2]!)?.[0] ?? "", "w:val");
      const atual = niveis.get(ilvl) ?? { start: 1, numFmt: "decimal", lvlText: "%1." };
      const doOverride = lerNiveis(o[2]!).get(ilvl);
      niveis.set(ilvl, {
        ...atual,
        ...(doOverride ?? {}),
        start: inicio ? Number(inicio) : (doOverride?.start ?? atual.start),
      });
    }
    nums.set(numId, niveis);
  }

  const estilos = new Map<string, { numId: string; ilvl: number }>();
  const reStyle = /<w:style\s[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/g;
  while ((m = reStyle.exec(stylesXml))) {
    const numPr = /<w:numPr>([\s\S]*?)<\/w:numPr>/.exec(m[2]!);
    if (!numPr) continue;
    const numId = attr(/<w:numId\b[^>]*\/?>/.exec(numPr[1]!)?.[0] ?? "", "w:val");
    if (!numId) continue;
    const ilvl = Number(attr(/<w:ilvl\b[^>]*\/?>/.exec(numPr[1]!)?.[0] ?? "", "w:val") ?? 0) || 0;
    estilos.set(m[1]!, { numId, ilvl });
  }

  return { nums, estilos };
}

/** Extrai w:numPr do <w:pPr> do parágrafo (ignora numPr de runs/estilos internos). */
function numPrDoParagrafo(xmlParagrafo: string) {
  const pPr = /<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(xmlParagrafo);
  if (!pPr) return null;
  const numPr = /<w:numPr>([\s\S]*?)<\/w:numPr>/.exec(pPr[1]!);
  const pStyle = attr(/<w:pStyle\b[^>]*\/?>/.exec(pPr[1]!)?.[0] ?? "", "w:val");
  if (!numPr) return pStyle ? { numId: null, ilvl: null, pStyle } : null;
  const numId = attr(/<w:numId\b[^>]*\/?>/.exec(numPr[1]!)?.[0] ?? "", "w:val");
  const ilvl = attr(/<w:ilvl\b[^>]*\/?>/.exec(numPr[1]!)?.[0] ?? "", "w:val");
  return { numId, ilvl: ilvl === null ? null : Number(ilvl), pStyle };
}

function classificar(numFmt: string): FormatoNum {
  if (/^decimal/i.test(numFmt) || numFmt === "ordinal") return "decimal";
  if (/Letter$/i.test(numFmt)) return "letra";
  if (/Roman$/i.test(numFmt)) return "romano";
  return "outro";
}

function paraLetra(n: number, maiuscula: boolean) {
  const l = String.fromCharCode(97 + ((n - 1) % 26));
  return maiuscula ? l.toUpperCase() : l;
}

function paraRomano(n: number, maiuscula: boolean) {
  const t: [number, string][] = [
    [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"],
    [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
  ];
  let r = "";
  let v = n;
  for (const [valor, s] of t) while (v >= valor) { r += s; v -= valor; }
  return maiuscula ? r.toUpperCase() : r;
}

function formatarValor(valor: number, numFmt: string) {
  switch (numFmt) {
    case "decimalZero":
      return valor < 10 ? `0${valor}` : String(valor);
    case "lowerLetter":
      return paraLetra(valor, false);
    case "upperLetter":
      return paraLetra(valor, true);
    case "lowerRoman":
      return paraRomano(valor, false);
    case "upperRoman":
      return paraRomano(valor, true);
    default:
      return String(valor);
  }
}

/**
 * Percorre os parágrafos na ordem do documento e devolve, para cada índice,
 * a marca de numeração automática (ou null). Contadores por (numId, nível),
 * com reinício dos níveis mais profundos — igual ao Word.
 */
export function calcularNumeracao(
  paragrafos: { indice: number; xml: string; ehParagrafo: boolean }[],
  mapa: MapaNumeracao,
): Map<number, MarcaNumerada> {
  const saida = new Map<number, MarcaNumerada>();
  const contadores = new Map<string, number>();
  const chave = (numId: string, ilvl: number) => `${numId}:${ilvl}`;

  for (const p of paragrafos) {
    if (!p.ehParagrafo) continue;
    const info = numPrDoParagrafo(p.xml);
    if (!info) continue;

    let numId = info.numId;
    let ilvl = info.ilvl ?? 0;
    if (!numId && info.pStyle) {
      const doEstilo = mapa.estilos.get(info.pStyle);
      if (!doEstilo) continue;
      numId = doEstilo.numId;
      if (info.ilvl === null) ilvl = doEstilo.ilvl;
    }
    if (!numId || numId === "0") continue;

    const niveis = mapa.nums.get(numId);
    const nivel = niveis?.get(ilvl) ?? { start: 1, numFmt: "decimal", lvlText: "%1." };
    if (classificar(nivel.numFmt) === "outro" && nivel.numFmt !== "none") {
      // bullet e afins: não é numeração sequencial
      if (nivel.numFmt === "bullet") continue;
    }

    const k = chave(numId, ilvl);
    const atual = contadores.has(k) ? contadores.get(k)! + 1 : nivel.start;
    contadores.set(k, atual);
    // reinicia níveis mais profundos da mesma lista
    for (const outra of [...contadores.keys()]) {
      const [nid, lv] = outra.split(":");
      if (nid === numId && Number(lv) > ilvl) contadores.delete(outra);
    }

    const rotulo = (nivel.lvlText || "%1.")
      .replace(/%(\d)/g, (_, d: string) => {
        const alvo = Number(d) - 1;
        if (alvo === ilvl) return formatarValor(atual, nivel.numFmt);
        const v = contadores.get(chave(numId, alvo));
        const nAlvo = niveis?.get(alvo);
        return v ? formatarValor(v, nAlvo?.numFmt ?? "decimal") : "";
      })
      .trim();

    saida.set(p.indice, {
      numId,
      ilvl,
      valor: atual,
      formato: classificar(nivel.numFmt),
      rotulo: rotulo || String(atual),
    });
  }
  return saida;
}
