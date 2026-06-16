import type {
  ProductReview,
  ReviewSort,
} from "@marketplace/contracts";
import { Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { SelectField } from "../../shared/SelectField";

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
  const [rating, setRating] = useState<number | null>(null);
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReviews([]);
    setPage(1);
    setTotalPages(1);
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
          pageSize: 6,
          sort,
          ...(rating ? { rating } : {}),
        },
        controller.signal,
      )
      .then((response) => {
        setReviews((current) =>
          page === 1 ? response.items : [...current, ...response.items],
        );
        setTotalPages(response.totalPages);
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

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || loading || page >= totalPages) {
      return;
    }
    // Следующая страница запрашивается только когда пользователь приблизился
    // к концу списка, поэтому отзывы не утяжеляют первоначальную загрузку товара.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setPage((current) => current + 1);
        }
      },
      { rootMargin: "250px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, page, totalPages]);

  return (
    <section className="mt-8 rounded-3xl bg-white p-7 lg:p-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Отзывы покупателей</p>
          <h2 className="mt-2 text-3xl font-semibold">Что говорят о товаре</h2>
          <p className="mt-2 text-sm text-ink/45">
            Всего отзывов: {props.reviewCount}
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

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
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
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-48 animate-pulse rounded-2xl bg-cream"
            />
          ))}
        </div>
      )}
      <div ref={loadMoreRef} className="h-1" aria-hidden="true" />
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
    </article>
  );
}
