import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReceiptScanEditor, buildConfirmReceiptDraft } from "../../components/receipts/ReceiptScanEditor";
import { ReceiptScanProgress } from "../../components/receipts/ReceiptScanProgress";
import { Button } from "../../components/ui/Button";
import { SectionCard } from "../../components/ui/SectionCard";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
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
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<ConfirmReceiptRequest | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [isFinalizingProgress, setIsFinalizingProgress] = useState(false);

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
      showToast(`Recibo lido com sucesso: ${file.name}`, "success");
      setScanProgress(100);
      setIsFinalizingProgress(true);
      window.setTimeout(() => {
        setDraft(buildConfirmReceiptDraft(response));
        setIsFinalizingProgress(false);
      }, 240);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (payload: ConfirmReceiptRequest) =>
      apiClient<ConfirmReceiptResponse>("/receipts", {
        method: "POST",
        token,
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["receipts", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory", "shopping-list"] });
      await queryClient.invalidateQueries({ queryKey: ["shopping-list", "items"] });
      await queryClient.invalidateQueries({ queryKey: ["overview"] });
      showToast("Compra confirmada com sucesso.", "success");
      resetFlow();
    },
  });

  useEffect(() => {
    if (!scanMutation.isPending) return;

    setScanProgress(4);
    const interval = window.setInterval(() => {
      setScanProgress((current) => (current >= 92 ? current : current + (current < 48 ? 9 : 4)));
    }, 180);

    return () => window.clearInterval(interval);
  }, [scanMutation.isPending]);

  function resetFlow() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFileName("");
    setSelectedFile(null);
    setDraft(null);
    setScanProgress(0);
    setIsFinalizingProgress(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setSelectedFileName(file.name);
    setSelectedFile(file);
  }

  function handleSubmitSelectedFile() {
    if (!selectedFile) {
      showToast("Selecione uma imagem antes de enviar para leitura.", "error");
      return;
    }
    scanMutation.mutate(selectedFile);
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
                disabled={scanMutation.isPending || isFinalizingProgress}
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
                  Esse e o CTA principal do fluxo. Use imagem nitida, bem enquadrada e com os dados do cupom visiveis.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-1 text-sm text-white/80">
                  <span>JPG, PNG ou WebP</span>
                  <span>Leitura, revisao e confirmacao em sequencia</span>
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
                  <p className="font-semibold text-ink">2. Revisar extracao</p>
                  <p className="mt-1 text-sm text-muted">Revise os itens, quantidades e valores antes de confirmar.</p>
                </div>
                <div className="rounded-3xl bg-white px-4 py-4">
                  <p className="font-semibold text-ink">3. Confirmar compra</p>
                  <p className="mt-1 text-sm text-muted">A compra entra no historico e atualiza o inventario.</p>
                </div>
              </div>
            </SectionCard>
          </div>

          {scanMutation.isPending || isFinalizingProgress ? (
            <div className="mt-5">
              <ReceiptScanProgress
                description="Estamos analisando a imagem, organizando os produtos e preparando a revisao da compra."
                fileName={selectedFileName}
                progress={scanProgress}
                title="Lendo seu recibo"
              />
            </div>
          ) : null}

          {selectedFileName ? (
            <div className="mt-5 flex items-center justify-between gap-4 rounded-[28px] bg-secondary/70 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Arquivo selecionado</p>
                <p className="mt-1 text-sm font-semibold text-ink">{selectedFileName}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={scanMutation.isPending || isFinalizingProgress}
                  size="sm"
                  variant="ghost"
                  onClick={resetFlow}
                >
                  Trocar imagem
                </Button>
                <Button
                  disabled={!selectedFile || scanMutation.isPending || isFinalizingProgress}
                  size="sm"
                  onClick={handleSubmitSelectedFile}
                >
                  Confirmar imagem
                </Button>
              </div>
            </div>
          ) : null}

          {previewUrl && !scanMutation.isPending && !isFinalizingProgress ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="overflow-hidden rounded-[28px] border border-border/10 bg-secondary/40">
                <img alt="Pre-visualizacao do recibo" className="h-full w-full object-cover" src={previewUrl} />
              </div>
              <SectionCard className="grid gap-4 bg-secondary/60">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
                  Confirmar envio
                </p>
                <p className="text-sm text-muted">
                  Confira se esta e a nota certa. A IA so sera chamada depois da sua confirmacao.
                </p>
                <Button
                  disabled={!selectedFile || scanMutation.isPending || isFinalizingProgress}
                  size="lg"
                  onClick={handleSubmitSelectedFile}
                >
                  Ler com IA
                </Button>
              </SectionCard>
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
