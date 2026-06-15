import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from "typeorm";
import { ProductEntity } from "./product.entity";

@Entity({ name: "product_variants" })
@Index("product_variants_product_idx", ["productId"])
@Unique(["productId", "slug"])
export class ProductVariantEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ name: "product_id" })
  productId!: string;

  @ManyToOne(() => ProductEntity, (product) => product.variants, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "product_id" })
  product!: ProductEntity;

  @Column()
  slug!: string;

  @Column()
  name!: string;

  @Column()
  value!: string;

  @Column({ name: "price_minor" })
  priceMinor!: number;

  @Column()
  stock!: number;

  @Column({ name: "image_url" })
  imageUrl!: string;
}
