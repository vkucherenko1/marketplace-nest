import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { ProductEntity } from "./product.entity";

@Entity({ name: "product_reviews" })
@Index("product_reviews_product_idx", ["productId", "createdAt"])
export class ProductReviewEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ name: "product_id" })
  productId!: string;

  @ManyToOne(() => ProductEntity, (product) => product.reviews, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "product_id" })
  product!: ProductEntity;

  @Column({ name: "author_name" })
  authorName!: string;

  @Column({ name: "author_avatar_url", type: "text", nullable: true })
  authorAvatarUrl!: string | null;

  @Column()
  rating!: number;

  @Column({ name: "review_text" })
  reviewText!: string;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
