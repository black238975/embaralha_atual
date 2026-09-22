/**
 * Traduz falhas técnicas (rede, autenticação, backend, configuração, dados)
 * em mensagens úteis, sempre indicando qual operação falhou.
 */

export type CategoriaErro =
  | "conexao"
  | "autenticacao"
  | "permissao"
  | "backend"
  | "configuracao"
  | "dados"
  | "desconhecido";

export type ErroDetalhado = {
  operacao: string;
  categoria: CategoriaErro;
  mensagem: string;
  detalhe: string;
};

const ROTULOS: Record<CategoriaErro, string> = {
  conexao: "Erro de conexão",
  autenticacao: "Erro de autenticação",
  permissao: "Erro de permissão",
  backend: "Erro do servidor",
  configuracao: "Erro de configuração",
  dados: "Erro nos dados",
  desconhecido: "Erro inesperado",
};

function textoDe(erro: unknown): string {
  if (!erro) return "";
  if (typeof erro === "string") return erro;
  if (erro instanceof Error) return erro.message;
  if (typeof erro === "object") {
    const obj = erro as { message?: unknown; error?: unknown; statusCode?: unknown };
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
    try {
      return JSON.stringify(erro);
    } catch {
      return String(erro);
    }
  }
  return String(erro);
}

export function classificarErro(erro: unknown): CategoriaErro {
  const texto = textoDe(erro).toLowerCase();
  const status = Number(
    (erro as { status?: unknown; statusCode?: unknown } | null)?.status ??
      (erro as { statusCode?: unknown } | null)?.statusCode ??
      0,
  );

  if (texto.includes("missing supabase environment") || texto.includes("connect supabase")) {
    return "configuracao";
  }
  if (
    texto.includes("failed to fetch") ||
    texto.includes("networkerror") ||
    texto.includes("network request failed") ||
    texto.includes("load failed") ||
    texto.includes("err_connection") ||
    texto.includes("timeout") ||
    texto.includes("aborted")
  ) {
    return "conexao";
  }
  if (
    status === 401 ||
    texto.includes("jwt") ||
    texto.includes("sessão expirada") ||
    texto.includes("not authenticated") ||
    texto.includes("invalid login") ||
    texto.includes("refresh token")
  ) {
    return "autenticacao";
  }
  if (
    status === 403 ||
    texto.includes("row-level security") ||
    texto.includes("permission denied") ||
    texto.includes("not authorized")
  ) {
    return "permissao";
  }
  if (
    texto.includes("bucket not found") ||
    texto.includes("does not exist") ||
    texto.includes("schema cache") ||
    texto.includes("could not find the table")
  ) {
    return "configuracao";
  }
  if (
    status === 400 ||
    status === 404 ||
    status === 409 ||
    status === 422 ||
    texto.includes("violates") ||
    texto.includes("duplicate key") ||
    texto.includes("invalid input")
  ) {
    return "dados";
  }
  if (status >= 500) return "backend";
  return "desconhecido";
}

const DICAS: Record<CategoriaErro, string> = {
  conexao: "Não foi possível falar com o servidor. Verifique sua internet e tente de novo.",
  autenticacao: "Sua sessão expirou. Entre novamente na sua conta e repita a ação.",
  permissao: "Você não tem permissão para esse item. Confira se ele é da sua conta.",
  backend: "O servidor respondeu com uma falha. Tente novamente em alguns instantes.",
  configuracao: "O serviço de dados não está disponível ou não foi configurado corretamente.",
  dados: "Algum dado enviado está incompleto ou inválido.",
  desconhecido: "Algo inesperado aconteceu.",
};

export function detalharErro(operacao: string, erro: unknown): ErroDetalhado {
  const categoria = classificarErro(erro);
  const detalhe = textoDe(erro) || "sem detalhes técnicos";
  return {
    operacao,
    categoria,
    detalhe,
    mensagem: `${operacao}: ${ROTULOS[categoria]}. ${DICAS[categoria]}`,
  };
}

/** Erro com mensagem já legível para o usuário. */
export class ErroApp extends Error {
  categoria: CategoriaErro;
  operacao: string;
  detalhe: string;

  constructor(detalhado: ErroDetalhado) {
    super(detalhado.mensagem);
    this.name = "ErroApp";
    this.categoria = detalhado.categoria;
    this.operacao = detalhado.operacao;
    this.detalhe = detalhado.detalhe;
  }
}

export function erroApp(operacao: string, erro: unknown): ErroApp {
  if (erro instanceof ErroApp) return erro;
  const detalhado = detalharErro(operacao, erro);
  console.error(`[${detalhado.categoria}] ${operacao}:`, detalhado.detalhe);
  return new ErroApp(detalhado);
}

/** Executa uma operação e converte qualquer falha em mensagem útil. */
export async function comErro<T>(operacao: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw erroApp(operacao, err);
  }
}

export function mensagemDeErro(operacao: string, erro: unknown): string {
  return erroApp(operacao, erro).message;
}
