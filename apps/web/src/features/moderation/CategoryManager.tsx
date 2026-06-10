import type { Category, SaveCategory } from "@marketplace/contracts";
import { FolderPlus, Pencil, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { SelectField } from "../../shared/SelectField";

const emptyForm: SaveCategory = {
  name: "",
  slug: "",
  parentId: null,
};

export function CategoryManager({ accessToken }: { accessToken: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<SaveCategory>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const orderedCategories = useMemo(
    () => flattenCategoryTree(categories),
    [categories],
  );

  function loadCategories(): void {
    void api
      .categories()
      .then(setCategories)
      .catch((reason: unknown) => setMessage(toErrorMessage(reason)));
  }

  useEffect(loadCategories, []);

  const parentOptions = [
    { value: "", label: "Корневая категория", description: "Первый уровень" },
    ...orderedCategories
      .filter((category) => category.id !== editingId && category.depth < 5)
      .map((category) => ({
        value: category.id,
        label: `${"— ".repeat(category.depth - 1)}${category.name}`,
        description: `Уровень ${category.depth}`,
      })),
  ];

  function resetForm(): void {
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <section className="mt-10 rounded-[2rem] bg-white p-7 shadow-card lg:p-10">
      <p className="eyebrow">Модерация</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold">Категории каталога</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">
            Создавайте разделы глубиной до пяти уровней. Непустую категорию
            необходимо сначала освободить от товаров и дочерних разделов.
          </p>
        </div>
        <span className="rounded-full bg-cream px-4 py-2 text-sm font-semibold">
          {categories.length} категорий
        </span>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid max-h-[680px] content-start gap-2 overflow-y-auto pr-2">
          {orderedCategories.map((category) => {
            const hasChildren = categories.some(
              (item) => item.parentId === category.id,
            );
            return (
              <article
                key={category.id}
                className="flex items-center gap-3 rounded-2xl border border-ink/10 p-3"
                style={{ marginLeft: Math.min(category.depth - 1, 4) * 18 }}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cream text-sm font-bold">
                  {category.depth}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate">{category.name}</strong>
                  <span className="text-xs text-ink/45">
                    /{category.slug} · {category.productCount} товаров
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Редактировать ${category.name}`}
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-cream"
                  onClick={() => {
                    setEditingId(category.id);
                    setForm({
                      name: category.name,
                      slug: category.slug,
                      parentId: category.parentId,
                    });
                    setMessage("");
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  aria-label={`Удалить ${category.name}`}
                  title={
                    hasChildren || category.productCount > 0
                      ? "Сначала удалите дочерние категории и перенесите товары"
                      : "Удалить категорию"
                  }
                  disabled={hasChildren || category.productCount > 0}
                  className="grid h-9 w-9 place-items-center rounded-full text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-25"
                  onClick={() => {
                    if (!window.confirm(`Удалить категорию «${category.name}»?`)) {
                      return;
                    }
                    setMessage("");
                    void api
                      .deleteCategory(accessToken, category.id)
                      .then(() => {
                        if (editingId === category.id) {
                          resetForm();
                        }
                        loadCategories();
                      })
                      .catch((reason: unknown) =>
                        setMessage(toErrorMessage(reason)),
                      );
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            );
          })}
        </div>

        <form
          className="h-fit rounded-[1.5rem] bg-cream p-6"
          onSubmit={(event) => {
            event.preventDefault();
            setSaving(true);
            setMessage("");
            const operation = editingId
              ? api.updateCategory(accessToken, editingId, form)
              : api.createCategory(accessToken, form);
            void operation
              .then(() => {
                setMessage(
                  editingId ? "Категория обновлена" : "Категория создана",
                );
                resetForm();
                loadCategories();
              })
              .catch((reason: unknown) => setMessage(toErrorMessage(reason)))
              .finally(() => setSaving(false));
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold">
              {editingId ? "Редактирование" : "Новая категория"}
            </h3>
            {editingId && (
              <button
                type="button"
                aria-label="Отменить редактирование"
                className="grid h-9 w-9 place-items-center rounded-full bg-white"
                onClick={resetForm}
              >
                <X size={17} />
              </button>
            )}
          </div>
          <label className="mt-6 block text-sm font-medium">
            Название
            <input
              required
              className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Адрес страницы
            <input
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="smartphones"
              className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3"
              value={form.slug}
              onChange={(event) =>
                setForm({ ...form, slug: event.target.value.toLowerCase() })
              }
            />
          </label>
          <div className="mt-4 text-sm font-medium">
            <span className="mb-2 block">Родительская категория</span>
            <SelectField
              ariaLabel="Родительская категория"
              value={form.parentId ?? ""}
              options={parentOptions}
              onChange={(value) =>
                setForm({ ...form, parentId: value || null })
              }
            />
          </div>
          <button
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3.5 font-bold text-white"
            disabled={saving}
          >
            {editingId ? <Save size={18} /> : <FolderPlus size={18} />}
            {saving
              ? "Сохраняем..."
              : editingId
                ? "Сохранить категорию"
                : "Добавить категорию"}
          </button>
          {message && <p className="mt-4 text-sm font-medium">{message}</p>}
        </form>
      </div>
    </section>
  );
}

function flattenCategoryTree(categories: Category[]): Category[] {
  const children = new Map<string | null, Category[]>();
  categories.forEach((category) => {
    const group = children.get(category.parentId) ?? [];
    group.push(category);
    children.set(category.parentId, group);
  });
  children.forEach((group) =>
    group.sort((left, right) => left.name.localeCompare(right.name, "ru")),
  );

  // Обход дерева сохраняет визуальную связь родителя и потомков.
  const result: Category[] = [];
  function visit(parentId: string | null): void {
    for (const category of children.get(parentId) ?? []) {
      result.push(category);
      visit(category.id);
    }
  }
  visit(null);
  return result;
}

function toErrorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Не удалось выполнить операцию";
}
