import type { AnaliseProva, Contexto, Questao } from "./analyze";

/** Junta ao bloco anterior tudo que o usuário desmarcou como "não é questão". */
export function aplicarRevisao(analise: AnaliseProva, desmarcadas: Set<number>): AnaliseProva {
  if (!desmarcadas.size) return analise;

  const ordenar = (a: number[]) => a.slice().sort((x, y) => x - y);
  const todos = (q: Questao) => [
    ...q.corpo,
    ...q.afirmacoes.flatMap((a) => a.indices),
    ...q.alternativas.flatMap((a) => a.indices),
    ...q.rodape,
  ];

  const questoes: Questao[] = [];
  const mapa = new Map<number, number>(); // índice original → novo índice
  let cabecalho = analise.cabecalho.slice();
  const apoios = analise.contextos.map((c) => c.apoio.slice());

  analise.contextos.forEach((contexto, ctxIdx) => {
    let ultimaDoContexto: Questao | null = null;

    contexto.questoes.forEach((idx) => {
      const q = analise.questoes[idx]!;
      if (!desmarcadas.has(idx)) {
        const nova = { ...q };
        mapa.set(idx, questoes.length);
        questoes.push(nova);
        ultimaDoContexto = nova;
        return;
      }
      const extras = ordenar(todos(q));
      if (ultimaDoContexto) {
        // conteúdo desmarcado vira parte final da questão anterior do mesmo contexto
        ultimaDoContexto.rodape = ordenar(ultimaDoContexto.rodape.concat(extras));
      } else {
        // sem questão anterior no contexto: passa a fazer parte do texto de apoio
        apoios[ctxIdx] = ordenar(apoios[ctxIdx]!.concat(extras));
      }
    });
  });

  /* --- reconstrói os contextos com os novos índices --------------------- */
  const contextos: Contexto[] = [];
  let apoioPendente: number[] = [];

  analise.contextos.forEach((contexto, ctxIdx) => {
    const restantes = contexto.questoes
      .filter((i) => mapa.has(i))
      .map((i) => mapa.get(i)!);
    const apoio = ordenar(apoioPendente.concat(apoios[ctxIdx]!));
    if (!restantes.length) {
      // contexto ficou sem questões: seu texto acompanha o próximo contexto
      apoioPendente = apoio;
      return;
    }
    apoioPendente = [];
    contextos.push({ id: contexto.id, apoio, questoes: restantes });
  });

  if (apoioPendente.length) {
    const ultimo = contextos[contextos.length - 1];
    if (ultimo) {
      const ultimaQuestao = questoes[ultimo.questoes[ultimo.questoes.length - 1]!]!;
      ultimaQuestao.rodape = ordenar(ultimaQuestao.rodape.concat(apoioPendente));
    } else {
      cabecalho = ordenar(cabecalho.concat(apoioPendente));
    }
  }

  return { ...analise, cabecalho, questoes, contextos };
}
