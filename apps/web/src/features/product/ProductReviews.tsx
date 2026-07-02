import type {
  ProductReview,
  ReviewSort,
} from "@marketplace/contracts";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api";
import { IconButton } from "../../shared/IconButton";
import { SelectField } from "../../shared/SelectField";

const REVIEWS_PER_PAGE = 5;

const sortOptions: Array<{
  value: ReviewSort;
  label: string;
  description: string;
}> = [
  {
    value: "newest",
    label: "Сначала новые",
    description: "По дате от новых к старым",
  },
  {
    value: "oldest",
    label: "Сначала старые",
    description: "По дате от старых к новым",
  },
];

export function ProductReviews(props: {
  productSlug: string;
  reviewCount: number;
}) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [rating, setRating] = useState<number | null>(null);
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReviews([]);
    setPage(1);
    setTotalPages(1);
    setTotal(0);
  }, [props.productSlug, rating, sort]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api
      .productReviews(
        props.productSlug,
        {
          page,
          pageSize: REVIEWS_PER_PAGE,
          sort,
          ...(rating ? { rating } : {}),
        },
        controller.signal,
      )
      .then((response) => {
        setReviews(response.items);
        setTotal(response.total);
        setTotalPages(Math.max(1, response.totalPages));
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error ? reason.message : "Не удалось загрузить отзывы",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [page, props.productSlug, rating, sort]);

  return (
    <section className="mt-8 rounded-3xl bg-white p-7 lg:p-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Отзывы покупателей</p>
          <h2 className="mt-2 text-3xl font-semibold">Что говорят о товаре</h2>
          <p className="mt-2 text-sm text-ink/45">
            Всего отзывов: {props.reviewCount}
            {rating ? `, найдено с оценкой ${rating}: ${total}` : ""}
          </p>
        </div>
        <SelectField
          ariaLabel="Сортировка отзывов"
          className="min-w-56"
          value={sort}
          options={sortOptions}
          onChange={setSort}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <RatingFilter
          active={rating === null}
          label="Все оценки"
          onClick={() => setRating(null)}
        />
        {[5, 4, 3, 2, 1].map((value) => (
          <RatingFilter
            key={value}
            active={rating === value}
            label={`${value} ★`}
            onClick={() => setRating(value)}
          />
        ))}
      </div>

      <div className="mt-7 grid gap-4 xl:grid-cols-5">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {!loading && reviews.length === 0 && (
        <div className="mt-7 rounded-2xl bg-cream px-5 py-12 text-center text-ink/55">
          Отзывов с такой оценкой пока нет.
        </div>
      )}
      {error && <p className="mt-5 text-sm text-red-700">{error}</p>}
      {loading && (
        <div className="mt-6 grid gap-4 xl:grid-cols-5">
          {Array.from({ length: REVIEWS_PER_PAGE }, (_, index) => (
            <div
              key={index}
              className="h-48 animate-pulse rounded-2xl bg-cream"
            />
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <ReviewPagination
          page={page}
          totalPages={totalPages}
          loading={loading}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}

function RatingFilter(props: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        props.active
          ? "bg-lime text-white"
          : "border border-ink/10 hover:border-lime hover:text-lime"
      }`}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}

function ReviewCard({ review }: { review: ProductReview }) {
  return (
    <article className="rounded-2xl border border-ink/10 p-5">
      <div className="flex items-center gap-3">
        {review.authorAvatarUrl && (
          <img
            className="h-11 w-11 rounded-full object-cover"
            src={review.authorAvatarUrl}
            alt=""
          />
        )}
        <div>
          <strong className="block">{review.authorName}</strong>
          <span className="text-xs text-ink/45">
            {new Date(review.createdAt).toLocaleDateString("ru-RU")}
          </span>
        </div>
      </div>
      <div className="mt-4 flex gap-1 text-amber-500">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            className={index < review.rating ? "fill-current" : ""}
            size={16}
          />
        ))}
      </div>
      <p className="mt-4 leading-7 text-ink/70">{review.text}</p>
      {review.imageUrls.length > 0 && (
        <div className="mt-4 grid grid-cols-5 gap-2">
          {review.imageUrls.slice(0, 5).map((imageUrl, index) => (
            <a
              key={imageUrl}
              className="group block overflow-hidden rounded-xl border border-ink/10 bg-cream"
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Фото ${index + 1} к отзыву ${review.authorName}`}
            >
              <img
                className="aspect-square h-full w-full object-cover transition group-hover:scale-105"
                src={imageUrl}
                alt=""
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

function ReviewPagination(props: {
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  const pages = Array.from({ length: props.totalPages }, (_, index) => index + 1)
    .filter(
      (page) =>
        page === 1 ||
        page === props.totalPages ||
        Math.abs(page - props.page) <= 1,
    );

  return (
    <nav
      className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-5"
      aria-label="Страницы отзывов"
    >
      <p className="text-sm text-ink/55">
        Страница {props.page} из {props.totalPages}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <IconButton
          aria-label="Предыдущая страница отзывов"
          disabled={props.loading || props.page <= 1}
          onClick={() => props.onPageChange(Math.max(1, props.page - 1))}
        >
          <ChevronLeft size={18} />
        </IconButton>
        {pages.map((page, index) => {
          const previous = pages[index - 1];
          const showGap = previous && page - previous > 1;
          return (
            <span key={page} className="flex items-center gap-2">
              {showGap && <span className="px-1 text-ink/35">...</span>}
              <button
                type="button"
                className={`h-10 min-w-10 rounded-xl px-3 text-sm font-semibold transition ${
                  page === props.page
                    ? "bg-lime text-white"
                    : "border border-ink/10 hover:border-lime hover:text-lime"
                }`}
                disabled={props.loading}
                onClick={() => props.onPageChange(page)}
              >
                {page}
              </button>
            </span>
          );
        })}
        <IconButton
          aria-label="Следующая страница отзывов"
          disabled={props.loading || props.page >= props.totalPages}
          onClick={() =>
            props.onPageChange(Math.min(props.totalPages, props.page + 1))
          }
        >
          <ChevronRight size={18} />
        </IconButton>
      </div>
    </nav>
  );
}
