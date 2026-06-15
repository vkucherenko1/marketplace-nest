import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { CategoryEntity } from "./category.entity";
import { ProductReviewEntity } from "./product-review.entity";
import { ProductVariantEntity } from "./product-variant.entity";
import { SellerEntity } from "./seller.entity";

export type ProductStatus = "ACTIVE" | "HIDDEN" | "DELETED";

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity({ name: "products" })
@Index("products_listing_idx", ["categoryId", "status", "rating", "priceMinor"])
@Index("products_seller_idx", ["sellerId", "status"])
export class ProductEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ unique: true })
  slug!: string;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column({ name: "category_id" })
  categoryId!: string;

  @ManyToOne(() => CategoryEntity, (category) => category.products, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "category_id" })
  category!: CategoryEntity;

  @Column({ name: "seller_id" })
  sellerId!: string;

  @ManyToOne(() => SellerEntity, (seller) => seller.products, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "seller_id" })
  seller!: SellerEntity;

  @Column({ name: "price_minor" })
  priceMinor!: number;

  @Column({ default: "USD" })
  currency!: "USD";

  @Column("numeric", {
    precision: 3,
    scale: 2,
    transformer: numericTransformer,
  })
  rating!: number;

  @Column({ name: "review_count" })
  reviewCount!: number;

  @Column({ name: "image_url" })
  imageUrl!: string;

  @Column()
  stock!: number;

  @Column({ default: "ACTIVE" })
  status!: ProductStatus;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => ProductVariantEntity, (variant) => variant.product)
  variants!: ProductVariantEntity[];

  @OneToMany(() => ProductReviewEntity, (review) => review.product)
  reviews!: ProductReviewEntity[];
}
