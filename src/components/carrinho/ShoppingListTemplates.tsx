import type { ShoppingTemplate } from "../../lib/shopping-list/shoppingTemplates";
import { formatDateTime } from "../../lib/utils/formatters";
import { Button } from "../ui/Button";

function getTemplateDateLabel(value: string) {
  try {
    return formatDateTime(value);
  } catch {
    return "sem data";
  }
}

export function ShoppingListTemplates({
  canSave,
  description,
  isApplyingId,
  name,
  templates,
  onApply,
  onChangeDescription,
  onChangeName,
  onDelete,
  onSave,
}: {
  canSave: boolean;
  description: string;
  isApplyingId: string | null;
  name: string;
  templates: ShoppingTemplate[];
  onApply: (template: ShoppingTemplate) => void;
  onChangeDescription: (value: string) => void;
  onChangeName: (value: string) => void;
  onDelete: (templateId: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
        <input
          className="input-shell"
          placeholder="Nome da lista salva"
          value={name}
          onChange={(event) => onChangeName(event.target.value)}
        />
        <input
          className="input-shell"
          placeholder="Descricao opcional"
          value={description}
          onChange={(event) => onChangeDescription(event.target.value)}
        />
        <Button disabled={!canSave} onClick={onSave}>
          Salvar lista atual
        </Button>
      </div>

      {templates.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {templates.map((template) => (
            <article
              key={template.id}
              className="grid min-h-48 gap-4 rounded-lg bg-secondary/70 p-4"
            >
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-ink">{template.name}</h3>
                {template.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{template.description}</p>
                ) : null}
                <p className="mt-3 text-sm font-semibold text-tertiary">
                  {template.items.length} item(ns)
                </p>
                <p className="mt-1 text-xs text-muted">
                  Atualizado {getTemplateDateLabel(template.updatedAt)}
                </p>
              </div>

              <div className="grid gap-2 self-end">
                <Button
                  isFullWidth
                  isLoading={isApplyingId === template.id}
                  size="sm"
                  variant="outline"
                  onClick={() => onApply(template)}
                >
                  Iniciar agora
                </Button>
                <Button
                  className="text-red-600 hover:bg-red-50"
                  disabled={Boolean(isApplyingId)}
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(template.id)}
                >
                  Apagar
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-secondary/70 px-4 py-5 text-sm text-muted">
          Nenhuma lista salva ainda.
        </div>
      )}
    </div>
  );
}
