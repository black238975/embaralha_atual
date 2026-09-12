import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  titulo: string;
  descricao?: string;
  /** Função que devolve o conteúdo do .docx a ser exibido. */
  carregar: () => Promise<Blob>;
};

export function VisualizadorDocx({ aberto, onOpenChange, titulo, descricao, carregar }: Props) {
  const alvo = useRef<HTMLDivElement | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    let cancelado = false;

    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const [{ renderAsync }, blob] = await Promise.all([import("docx-preview"), carregar()]);
        if (cancelado) return;
        // Espera o container existir no DOM depois da animação do diálogo.
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const container = alvo.current;
        if (cancelado || !container) return;
        container.innerHTML = "";
        await renderAsync(blob, container, undefined, {
          className: "docx",
          inWrapper: true,
          ignoreWidth: true,
          ignoreHeight: true,
          breakPages: true,
          experimental: true,
        });
      } catch (err) {
        if (!cancelado) {
          setErro(
            err instanceof Error
              ? `Não foi possível exibir este arquivo: ${err.message}`
              : "Não foi possível exibir este arquivo.",
          );
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [aberto, carregar]);

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-6 py-4">
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {descricao ?? "Pré-visualização do documento antes de baixar."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-auto bg-muted/40 p-4">
          {carregando && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Preparando a pré-visualização...
            </div>
          )}
          {erro && <p className="py-10 text-center text-sm text-destructive">{erro}</p>}
          <div
            ref={alvo}
            className="docx-preview mx-auto [&_.docx-wrapper]:bg-transparent [&_.docx-wrapper]:p-0 [&_section.docx]:mx-auto [&_section.docx]:mb-4 [&_section.docx]:w-full [&_section.docx]:max-w-3xl [&_section.docx]:rounded-lg [&_section.docx]:bg-white [&_section.docx]:p-8 [&_section.docx]:text-black [&_section.docx]:shadow"
            hidden={carregando || !!erro}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
