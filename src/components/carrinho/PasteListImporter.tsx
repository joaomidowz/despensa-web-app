import { useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { ParsedShoppingListItem, parsePastedShoppingList } from "./types";

export function PasteListImporter({
  isLoading = false,
  onImport,
}: {
  isLoading?: boolean;
  onImport: (items: ParsedShoppingListItem[]) => void;
}) {
  const [rawList, setRawList] = useState("");

  const parsedItems = useMemo(() => parsePastedShoppingList(rawList), [rawList]);

  function handleImport() {
    if (!parsedItems.length) return;
    onImport(parsedItems);
    setRawList("");
  }

  return (
    <div className="grid gap-4 rounded-[24px] bg-secondary/55 p-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-tertiary">
          Carregar lista
        </p>
        <h2 className="mt-2 text-xl font-bold text-ink">Colar varios itens de uma vez</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          Cole uma lista simples, com um item por linha. Linhas como <strong>Carne Moida 2x</strong>
          tambem viram quantidade automaticamente.
        </p>
      </div>

      <textarea
        className="input-shell min-h-[13rem] resize-y"
        placeholder={"acucar\narroz\nfeijao\npapel toalha\nCarne Moida 2x"}
        value={rawList}
        onChange={(event) => setRawList(event.target.value)}
      />

      <div className="flex flex-wrap justify-end gap-3">
        <Button disabled={!rawList.trim() || isLoading} variant="ghost" onClick={() => setRawList("")}>
          Limpar
        </Button>
        <Button disabled={!parsedItems.length} isLoading={isLoading} onClick={handleImport}>
          Carregar lista
        </Button>
      </div>
    </div>
  );
}
