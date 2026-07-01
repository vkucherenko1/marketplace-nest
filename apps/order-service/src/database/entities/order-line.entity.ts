import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { OrderEntity } from "./order.entity";

@Entity({ name: "order_lines" })
@Index("order_lines_order_idx", ["orderId"])
export class OrderLineEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ name: "order_id" })
  orderId!: string;

  @ManyToOne(() => OrderEntity, (order) => order.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: OrderEntity;

  @Column({ name: "product_id" })
  productId!: string;

  @Column({ name: "variant_id", type: "varchar", nullable: true })
  variantId!: string | null;

  @Column({ name: "seller_id" })
  sellerId!: string;

  @Column({ name: "category_id" })
  categoryId!: string;

  @Column()
  quantity!: number;

  @Column({ name: "price_minor" })
  priceMinor!: number;

  @Column({ name: "reserved_until", type: "timestamptz" })
  reservedUntil!: Date;
}
