import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { AnaliseProva } from "./docx/analyze";

export type GabaritoTemporario = {
  file: File;
  bytes: ArrayBuffer;
  analise: AnaliseProva;
};

export type UploadTemporario = {
  file: File;
  bytes: ArrayBuffer;
  analise: AnaliseProva;
  caminho: string;
  modoCorrecao: "gabarito" | "manual";
  gabarito?: GabaritoTemporario;
};

export type VersaoGerada = {
  letra: string;
  nome: string;
  arquivo: string;
  caminho: string;
  blob: Blob;
  url: string;
  gabarito?: {
    arquivo: string;
    caminho: string;
    blob: Blob;
    url: string;
  };
};

export type ResultadoTemporario = {
  provaId: string;
  nome: string;
  serie: string;
  turma: string;
  versoes: VersaoGerada[];
};

type FluxoValue = {
  upload: UploadTemporario | null;
  setUpload: (u: UploadTemporario | null) => void;
  resultado: ResultadoTemporario | null;
  setResultado: (r: ResultadoTemporario | null) => void;
  limparTudo: () => void;
};

const FluxoContext = createContext<FluxoValue | null>(null);

export function FluxoProvider({ children }: { children: ReactNode }) {
  const [upload, setUploadState] = useState<UploadTemporario | null>(null);
  const [resultado, setResultadoState] = useState<ResultadoTemporario | null>(null);

  const value = useMemo<FluxoValue>(
    () => ({
      upload,
      setUpload: setUploadState,
      resultado,
      setResultado: (r) => {
        setResultadoState((anterior) => {
          anterior?.versoes.forEach((v) => {
            URL.revokeObjectURL(v.url);
            if (v.gabarito) URL.revokeObjectURL(v.gabarito.url);
          });
          return r;
        });
      },
      limparTudo: () => {
        setUploadState(null);
        setResultadoState((anterior) => {
          anterior?.versoes.forEach((v) => {
            URL.revokeObjectURL(v.url);
            if (v.gabarito) URL.revokeObjectURL(v.gabarito.url);
          });
          return null;
        });
      },
    }),
    [upload, resultado],
  );

  return <FluxoContext.Provider value={value}>{children}</FluxoContext.Provider>;
}

export function useFluxo() {
  const ctx = useContext(FluxoContext);
  if (!ctx) throw new Error("useFluxo precisa estar dentro de FluxoProvider");
  return ctx;
}
