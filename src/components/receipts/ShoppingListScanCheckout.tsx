import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  ConfirmReceiptRequest,
  ConfirmReceiptResponse,
  ReconcileShoppingListResponse,
  ReceiptScanResponse,
  ShoppingListItemResponse,
} from "../../lib/api/contracts";
import { apiClient } from "../../lib/api/apiClient";
import { Button } from "../ui/Button";
import { SectionCard } from "../ui/SectionCard";
import { ReceiptScanProgress } from "./ReceiptScanProgress";
import { ReceiptScanEditor, buildConfirmReceiptDraft } from "./ReceiptScanEditor";

type ShoppingListScanCheckoutProps = {
  checkedItems: ShoppingListItemResponse[];
  onComplete: () => void;
};

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

export function ShoppingListScanCheckout({
  checkedItems,
  onComplete,
}: ShoppingListScanCheckoutProps) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<ConfirmReceiptRequest | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconcileShoppingListResponse | null>(null);
  const [approvedMatchedIds, setApprovedMatchedIds] = useState<string[]>([]);
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
      const nextDraft = buildConfirmReceiptDraft(response);
      setDraft(nextDraft);
      reconcileMutation.mutate({
        shopping_list_item_ids: checkedItems.map((item) => item.shopping_list_item_id),
        items: nextDraft.items,
      });
      showToast(`Recibo lido com sucesso: ${file.name}`, "success");
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: (payload: {
      shopping_list_item_ids: string[];
      items: ConfirmReceiptRequest["items"];
    }) =>
      apiClient<ReconcileShoppingListResponse>("/receipts/reconcile-shopping-list", {
        method: "POST",
        token,
        body: payload,
      }),
    onSuccess: (response) => {
      setScanProgress(100);
      setIsFinalizingProgress(true);
      window.setTimeout(() => {
        setReconciliation(response);
        setApprovedMatchedIds(response.matches.map((match) => match.shopping_list_item_id));
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
      showToast("Compra confirmada com conciliacao da lista.", "success");
      resetFlow();
      onComplete();
    },
  });

  useEffect(() => {
    if (!scanMutation.isPending && !reconcileMutation.isPending) return;

    const target = scanMutation.isPending ? 64 : 96;
    setScanProgress((current) => (current === 0 ? 5 : current));
    const interval = window.setInterval(() => {
      setScanProgress((current) => {
        if (current >= target) return current;
        const step = current < 42 ? 8 : 4;
        return Math.min(target, current + step);
      });
    }, 180);

    return () => window.clearInterval(interval);
  }, [reconcileMutation.isPending, scanMutation.isPending]);

  function resetFlow() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFileName("");
    setSelectedFile(null);
    setDraft(null);
    setReconciliation(null);
    setApprovedMatchedIds([]);
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
      showToast("Selecione uma nota antes de enviar para leitura.", "error");
      return;
    }
    scanMutation.mutate(selectedFile);
  }

  return (
    <div className="grid gap-6">
      {!draft ? (
        <SectionCard>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
            Scan da compra atual
          </p>
          <h2 className="mt-3 text-2xl font-bold">Escanear nota sem sair da lista</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            Este fluxo pertence a compra iniciada em Fazer compras. Depois da leitura, voce revisa os matches sugeridos e confirma a compra aqui mesmo.
          </p>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_20rem]">
            <label className="upload-shell-hero cursor-pointer" htmlFor="shopping-list-receipt-upload">
              <input
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                disabled={scanMutation.isPending || reconcileMutation.isPending || isFinalizingProgress}
                id="shopping-list-receipt-upload"
                type="file"
                onChange={handleFileChange}
              />
              <div className="grid gap-5">
                <span className="upload-shell-hero-badge">
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  Compra iniciada pela lista
                </span>
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/16">
                  <span className="material-symbols-outlined text-[34px] text-white">scan</span>
                </div>
              </div>
              <div className="grid gap-3">
                <p className="max-w-lg text-3xl font-bold leading-tight text-white">
                  Envie a nota desta compra e reconcilie com os itens marcados.
                </p>
                <p className="max-w-xl text-sm leading-7 text-white/82">
                  O app vai sugerir quais itens da lista devem sair com base nos produtos extraidos da nota.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-1 text-sm text-white/80">
                  <span>{checkedItems.length} item(ns) marcados nesta compra</span>
                  <span>Leitura, reconciliacao e confirmacao na mesma tela</span>
                </div>
                <span className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-white px-6 text-base font-semibold text-tertiary shadow-lg transition hover:bg-white/90">
                  Selecionar nota
                </span>
              </div>
            </label>

            <SectionCard className="grid gap-4 bg-secondary/60">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">Fluxo</p>
              <div className="grid gap-3">
                <div className="rounded-3xl bg-white px-4 py-4">
                  <p className="font-semibold text-ink">1. Ler a nota</p>
                  <p className="mt-1 text-sm text-muted">Envie a imagem do cupom ou NF.</p>
                </div>
                <div className="rounded-3xl bg-white px-4 py-4">
                  <p className="font-semibold text-ink">2. Conferir matches</p>
                  <p className="mt-1 text-sm text-muted">Aprove ou descarte as sugestoes do backend.</p>
                </div>
                <div className="rounded-3xl bg-white px-4 py-4">
                  <p className="font-semibold text-ink">3. Confirmar compra</p>
                  <p className="mt-1 text-sm text-muted">Itens aprovados saem da lista automaticamente.</p>
                </div>
              </div>
            </SectionCard>
          </div>

          {scanMutation.isPending || reconcileMutation.isPending || isFinalizingProgress ? (
            <div className="mt-5">
              <ReceiptScanProgress
                description={
                  reconcileMutation.isPending || isFinalizingProgress
                    ? "A nota ja foi lida. Agora estamos cruzando os produtos da compra com os itens marcados da sua lista."
                    : "Estamos lendo a nota e extraindo os produtos desta compra para comparar com a lista."
                }
                fileName={selectedFileName}
                progress={scanProgress}
                title={
                  reconcileMutation.isPending || isFinalizingProgress
                    ? "Conciliando com a lista"
                    : "Lendo a nota desta compra"
                }
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
                  disabled={scanMutation.isPending || reconcileMutation.isPending || isFinalizingProgress}
                  size="sm"
                  variant="ghost"
                  onClick={resetFlow}
                >
                  Trocar imagem
                </Button>
                <Button
                  disabled={!selectedFile || scanMutation.isPending || reconcileMutation.isPending || isFinalizingProgress}
                  size="sm"
                  onClick={handleSubmitSelectedFile}
                >
                  Confirmar imagem
                </Button>
              </div>
            </div>
          ) : null}

          {previewUrl && !scanMutation.isPending && !reconcileMutation.isPending && !isFinalizingProgress ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="overflow-hidden rounded-[28px] border border-border/10 bg-secondary/40">
                <img alt="Pre-visualizacao da nota" className="h-full w-full object-cover" src={previewUrl} />
              </div>
              <SectionCard className="grid gap-4 bg-secondary/60">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
                  Confirmar envio
                </p>
                <p className="text-sm text-muted">
                  Revise a imagem e envie para leitura so quando tiver certeza de que esta e a nota desta compra.
                </p>
                <Button
                  disabled={!selectedFile || scanMutation.isPending || reconcileMutation.isPending || isFinalizingProgress}
                  size="lg"
                  onClick={handleSubmitSelectedFile}
                >
                  Ler com IA
                </Button>
              </SectionCard>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {draft && reconciliation ? (
        <>
          <SectionCard>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tertiary">
              Revisao da lista
            </p>
            <h2 className="mt-3 text-2xl font-bold">Conferir o que deve sair da lista</h2>
            <p className="mt-2 text-sm text-muted">
              Aprove apenas os matches que fazem sentido para esta compra.
            </p>

            <div className="mt-5 grid gap-3">
              {reconciliation.matches.length ? (
                reconciliation.matches.map((match) => (
                  <label
                    key={`${match.shopping_list_item_id}-${match.receipt_product_name}`}
                    className="flex items-start gap-3 rounded-2xl bg-secondary/70 px-4 py-4"
                  >
                    <input
                      checked={approvedMatchedIds.includes(match.shopping_list_item_id)}
                      className="mt-1 h-4 w-4 rounded border-border/30 accent-primary"
                      type="checkbox"
                      onChange={() =>
                        setApprovedMatchedIds((current) =>
                          current.includes(match.shopping_list_item_id)
                            ? current.filter((id) => id !== match.shopping_list_item_id)
                            : [...current, match.shopping_list_item_id],
                        )
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{match.shopping_list_name}</p>
                      <p className="mt-1 text-sm text-muted">Nota: {match.receipt_product_name}</p>
                      <p className="mt-1 text-xs text-muted">Score {match.score}</p>
                    </div>
                  </label>
                ))
              ) : (
                <div className="rounded-2xl bg-secondary/70 px-4 py-5 text-sm text-muted">
                  Nenhum match sugerido automaticamente.
                </div>
              )}

              {reconciliation.unmatched_shopping_list_item_ids.length ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="text-sm font-semibold text-amber-900">Itens da lista sem correspondencia</p>
                  <p className="mt-2 text-sm text-amber-800">
                    Esses itens vao continuar na lista depois da confirmacao desta compra.
                  </p>
                </div>
              ) : null}
            </div>
          </SectionCard>

          <ReceiptScanEditor
            disabled={confirmMutation.isPending}
            draft={draft}
            isSubmitting={confirmMutation.isPending}
            previewUrl={previewUrl}
            onChange={setDraft}
            onReset={resetFlow}
            onSubmit={() =>
              confirmMutation.mutate({
                ...draft,
                matched_shopping_list_item_ids: approvedMatchedIds,
              })
            }
          />
        </>
      ) : null}
    </div>
  );
}
