import type {
  Category,
  CreateProductInput,
  PageSize,
  SellerProduct,
} from "@marketplace/contracts";
import { Eye, EyeOff, Plus, Store, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { readImageFiles, type UploadedImage } from "../../shared/fileUpload";
import { money } from "../../shared/format";
import { SelectField } from "../../shared/SelectField";
import { Pagination } from "../catalog/Pagination";

const emptyProduct: CreateProductInput = {
  name: "",
  description: "",
  categoryId: "",
  priceMinor: 0,
  imageUrl: "",
  stock: 1,
};

export function SellerDashboard({ accessToken }: { accessToken: string }) {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyProduct);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function load(): void {
    void Promise.all([
      api.sellerProducts(accessToken, page, pageSize),
      api.categories(),
    ])
      .then(([sellerPage, categoryList]) => {
        setProducts(sellerPage.items);
        setTotal(sellerPage.total);
        setTotalPages(sellerPage.totalPages);
        setCategories(categoryList);
      })
      .catch((reason: unknown) =>
        setMessage(reason instanceof Error ? reason.message : "Ошибка загрузки"),
      );
  }

  useEffect(load, [accessToken, page, pageSize]);

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: `${"— ".repeat(category.depth - 1)}${category.name}`,
    description: `Уровень ${category.depth}`,
  }));

  return (
    <section className="mt-10 rounded-3xl bg-white p-7 shadow-card lg:p-10">
      <p className="eyebrow">Кабинет продавца</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold">Мои товары</h2>
          <p className="mt-3 text-sm text-ink/55">
            Новая карточка создаётся скрытой. Опубликуйте её после проверки.
          </p>
        </div>
        <span className="rounded-xl bg-lime/10 px-4 py-2 font-semibold text-lime">
          {total} товаров
        </span>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_420px]">
        <div className="grid content-start gap-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="grid gap-4 rounded-2xl border border-ink/10 p-4 sm:grid-cols-[88px_1fr_auto]"
            >
              <img
                className="h-22 w-22 rounded-xl object-cover"
                src={product.imageUrl}
                alt=""
              />
              <div>
                <Link
                  className="font-semibold hover:text-lime"
                  to={`/product/${product.slug}`}
                >
                  {product.name}
                </Link>
                <p className="mt-1 text-sm text-ink/45">
                  {product.category.name} · остаток {product.stock}
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <strong>{money.format(product.priceMinor / 100)}</strong>
                  <span>Рейтинг {product.rating.toFixed(1)}</span>
                  <span>{product.reviewCount} отзывов</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${
                    product.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {product.status}
                </span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={
                    product.status === "ACTIVE"
                      ? `Скрыть ${product.name}`
                      : `Опубликовать ${product.name}`
                  }
                  onClick={() =>
                    void api
                      .changeProductStatus(
                        accessToken,
                        product.id,
                        product.status === "ACTIVE" ? "hide" : "restore",
                      )
                      .then(load)
                  }
                >
                  {product.status === "ACTIVE" ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
                <button
                  type="button"
                  className="icon-button text-red-700"
                  aria-label={`Удалить ${product.name}`}
                  onClick={() => {
                    if (!window.confirm(`Удалить товар «${product.name}»?`)) {
                      return;
                    }
                    void api.deleteProduct(accessToken, product.id).then(load);
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </article>
          ))}
          {products.length === 0 && (
            <div className="rounded-2xl bg-cream py-16 text-center text-ink/55">
              У вас пока нет товаров.
            </div>
          )}
          {total > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              visibleItems={products.length}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPage(1);
                setPageSize(nextPageSize);
              }}
            />
          )}
        </div>

        <form
          className="h-fit rounded-2xl bg-cream p-6"
          onSubmit={(event) => {
            event.preventDefault();
            setSaving(true);
            setMessage("");
            void api
              .createProduct(accessToken, {
                ...form,
                priceMinor: Math.round(Number(price) * 100),
              })
              .then(() => {
                setForm(emptyProduct);
                setUploadedImages([]);
                setPrice("");
                setMessage("Товар создан со статусом HIDDEN");
                load();
              })
              .catch((reason: unknown) =>
                setMessage(
                  reason instanceof Error ? reason.message : "Ошибка создания",
                ),
              )
              .finally(() => setSaving(false));
          }}
        >
          <h3 className="flex items-center gap-2 text-2xl font-semibold">
            <Store className="text-lime" /> Добавить товар
          </h3>
          <SellerField label="Название">
            <input
              required
              minLength={3}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </SellerField>
          <SellerField label="Описание">
            <textarea
              required
              minLength={20}
              rows={4}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </SellerField>
          <div className="mt-4 text-sm font-medium">
            <span className="mb-2 block">Категория</span>
            <SelectField
              ariaLabel="Категория товара"
              value={form.categoryId}
              options={
                categoryOptions.length > 0
                  ? categoryOptions
                  : [{ value: "", label: "Загрузка категорий" }]
              }
              onChange={(categoryId) => setForm({ ...form, categoryId })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SellerField label="Цена, USD">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </SellerField>
            <SellerField label="Остаток">
              <input
                required
                type="number"
                min="0"
                value={form.stock}
                onChange={(event) =>
                  setForm({ ...form, stock: Number(event.target.value) })
                }
              />
            </SellerField>
          </div>
          <ProductImageDropzone
            images={uploadedImages}
            coverUrl={form.imageUrl}
            onImages={(images) => {
              const next = [...uploadedImages, ...images];
              setUploadedImages(next);
              setForm({
                ...form,
                imageUrl:
                  form.imageUrl ||
                  next[0]?.publicUrl ||
                  next[0]?.dataUrl ||
                  "",
              });
            }}
            onCoverChange={(imageUrl) => setForm({ ...form, imageUrl })}
            onRemove={(imageId) => {
              const next = uploadedImages.filter((image) => image.id !== imageId);
              setUploadedImages(next);
              setForm({
                ...form,
                imageUrl:
                  form.imageUrl ===
                  (uploadedImages.find((image) => image.id === imageId)?.publicUrl ??
                    uploadedImages.find((image) => image.id === imageId)?.dataUrl)
                    ? next[0]?.publicUrl ?? next[0]?.dataUrl ?? ""
                    : form.imageUrl,
              });
            }}
            accessToken={accessToken}
          />
          <button
            className="primary-button mt-6 w-full"
            disabled={saving || !form.categoryId || !form.imageUrl}
          >
            <Plus size={18} />
            {saving ? "Создаём..." : "Создать товар"}
          </button>
          {message && <p className="mt-4 text-sm font-medium">{message}</p>}
        </form>
      </div>
    </section>
  );
}

function SellerField(props: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="mt-4 block text-sm font-medium">
      {props.label}
      <span className="mt-2 block [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-ink/15 [&>input]:bg-white [&>input]:px-4 [&>input]:py-3 [&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:border-ink/15 [&>textarea]:bg-white [&>textarea]:px-4 [&>textarea]:py-3">
        {props.children}
      </span>
    </label>
  );
}

function ProductImageDropzone(props: {
  images: UploadedImage[];
  coverUrl: string;
  onImages: (images: UploadedImage[]) => void;
  onCoverChange: (imageUrl: string) => void;
  onRemove: (imageId: string) => void;
  accessToken: string;
}) {
  async function handleFiles(files: FileList | File[]): Promise<void> {
    const images = await Promise.all(
      (await readImageFiles(files)).map(async (image) => {
        const ticket = await api.signMediaUpload(props.accessToken, {
          filename: image.name,
          contentType: image.type,
          size: image.size,
        });
        await fetch(ticket.uploadUrl, {
          method: "PUT",
          headers: ticket.requiredHeaders,
          body: image.file,
        });
        return { ...image, publicUrl: ticket.publicUrl };
      }),
    );
    if (images.length > 0) {
      props.onImages(images);
    }
  }

  return (
    <div className="mt-4">
      <span className="mb-2 block text-sm font-medium">Фото товара</span>
      <label
        className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-lime/40 bg-white p-5 text-center transition hover:border-lime hover:bg-lime/5"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void handleFiles(event.dataTransfer.files);
        }}
      >
        <input
          className="sr-only"
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            if (event.target.files) {
              void handleFiles(event.target.files);
            }
          }}
        />
        <strong>Перетащите фото сюда</strong>
        <span className="mt-1 text-sm text-ink/55">
          или нажмите, чтобы выбрать несколько файлов
        </span>
      </label>

      {props.images.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {props.images.map((image) => {
            const imageUrl = image.publicUrl ?? image.dataUrl;
            const isCover = imageUrl === props.coverUrl;
            return (
              <div key={image.id} className="relative">
                <button
                  type="button"
                  className={`block w-full overflow-hidden rounded-xl border-2 ${
                    isCover ? "border-lime" : "border-transparent"
                  }`}
                  onClick={() => props.onCoverChange(imageUrl)}
                >
                  <img
                    className="aspect-square w-full object-cover"
                    src={image.dataUrl}
                    alt={image.name}
                  />
                </button>
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-red-700"
                  aria-label={`Удалить фото ${image.name}`}
                  onClick={() => props.onRemove(image.id)}
                >
                  ×
                </button>
                {isCover && (
                  <span className="absolute bottom-1 left-1 rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold text-white">
                    Обложка
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
