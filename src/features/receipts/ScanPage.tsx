import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { ReceiptScanEditor, buildConfirmReceiptDraft } from "../../components/receipts/ReceiptScanEditor";
import { Button } from "../../components/ui/Button";
import { SectionCard } from "../../components/ui/SectionCard";
import {
  ConfirmReceiptRequest,
  ConfirmReceiptResponse,
  ReceiptScanResponse,
} from "../../lib/api/contracts";
import { apiClient } from "../../lib/api/apiClient";

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem."));
    reader.readAsDataURL(file);
  });
}

export function ScanPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [draft, setDraft] = useState<ConfirmReceiptRequest | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const scanMutation = useMutation({
    mutationFn: async (file: File) => {
      const image_base64 = await fileToBase64(file);
      return apiClient<ReceiptScanResponse>("/receipts/scan", {
        method: "POST",
        token,
        body: { image_base64 },
      });
    },
    onSuccess: (response, file) => {
      setDraft(buildConfirmReceiptDraft(response));
      showToast(`Recibo lido com sucesso: ${file.name}`, "success");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (payload: ConfirmReceiptRequest) =>
      apiClient<ConfirmReceiptResponse>("/receipts", {
        method: "POST",
        token,
        body: payload,
      }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["receipts", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory", "shopping-list"] });
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
      showToast("Compra confirmada e enviada para o estoque.", "success");
      resetFlow();
      navigate("/app/receipts");
      return response;
    },
  });

  function resetFlow() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFileName("");
    setDraft(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setSelectedFileName(file.name);

    scanMutation.mutate(file);
  }

  return (
    <div className="grid gap-6">
      <SectionCard>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">Receipts</p>
        <h1 className="mt-3 text-3xl font-bold">Escanear recibo</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          Envie a foto do cupom, revise os itens extraidos e confirme a compra para atualizar o estoque.
        </p>
      </SectionCard>

      {!draft ? (
        <SectionCard>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_20rem]">
            <label className="upload-shell-hero cursor-pointer" htmlFor="receipt-image-upload">
              <input
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                disabled={scanMutation.isPending}
                id="receipt-image-upload"
                type="file"
                onChange={handleFileChange}
              />
              <div className="grid gap-5">
                <span className="upload-shell-hero-badge">
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  Entrada principal
                </span>
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/16">
                  <span className="material-symbols-outlined text-[34px] text-white">scan</span>
                </div>
              </div>
              <div className="grid gap-3">
                <p className="max-w-lg text-3xl font-bold leading-tight text-white">
                  Envie a foto do recibo e deixe a IA montar sua compra.
                </p>
                <p className="max-w-xl text-sm leading-7 text-white/82">
                  Esse é o CTA principal do fluxo. Use imagem nítida, bem enquadrada e com os dados do cupom visíveis.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-1 text-sm text-white/80">
                  <span>JPG, PNG ou WebP</span>
                  <span>Leitura, revisão e confirmação em sequência</span>
                </div>
                <span className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-white px-6 text-base font-semibold text-tertiary shadow-lg transition hover:bg-white/90">
                  Selecionar recibo
                </span>
              </div>
            </label>

            <SectionCard className="grid gap-4 bg-secondary/60">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">Fluxo</p>
              <div className="grid gap-3">
                <div className="rounded-3xl bg-white px-4 py-4">
                  <p className="font-semibold text-ink">1. Enviar imagem</p>
                  <p className="mt-1 text-sm text-muted">Foto do cupom em JPG, PNG ou WebP.</p>
                </div>
                <div className="rounded-3xl bg-white px-4 py-4">
                  <p className="font-semibold text-ink">2. Revisar extração</p>
                  <p className="mt-1 text-sm text-muted">Ajuste nomes, valores e quantidades antes de salvar.</p>
                </div>
                <div className="rounded-3xl bg-white px-4 py-4">
                  <p className="font-semibold text-ink">3. Confirmar compra</p>
                  <p className="mt-1 text-sm text-muted">A compra entra no histórico e atualiza o inventário.</p>
                </div>
              </div>
            </SectionCard>
          </div>

          {scanMutation.isPending ? (
            <div className="mt-5 rounded-[28px] bg-secondary/70 px-5 py-4 text-sm text-muted">
              Lendo o recibo com IA...
            </div>
          ) : null}

          {selectedFileName ? (
            <div className="mt-5 flex items-center justify-between gap-4 rounded-[28px] bg-secondary/70 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Arquivo selecionado</p>
                <p className="mt-1 text-sm font-semibold text-ink">{selectedFileName}</p>
              </div>
              <Button disabled={scanMutation.isPending} size="sm" variant="ghost" onClick={resetFlow}>
                Trocar imagem
              </Button>
            </div>
          ) : null}
        </SectionCard>
      ) : (
        <ReceiptScanEditor
          disabled={confirmMutation.isPending}
          draft={draft}
          isSubmitting={confirmMutation.isPending}
          previewUrl={previewUrl}
          onChange={setDraft}
          onReset={resetFlow}
          onSubmit={() => confirmMutation.mutate(draft)}
        />
      )}
    </div>
  );
}
