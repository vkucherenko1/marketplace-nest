import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from "typeorm";
import type { AnalyticsEventName } from "@marketplace/contracts";

@Entity({ name: "analytics_events" })
@Index("analytics_events_seller_created_idx", ["sellerId", "createdAt"])
@Index("analytics_events_retention_idx", ["createdAt"])
export class AnalyticsEventEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  name!: AnalyticsEventName;

  @Column({ name: "order_id", type: "varchar", nullable: true })
  orderId!: string | null;

  @Column({ name: "product_id", type: "varchar", nullable: true })
  productId!: string | null;

  @Column({ name: "seller_id", type: "varchar", nullable: true })
  sellerId!: string | null;

  @Column({ name: "category_id", type: "varchar", nullable: true })
  categoryId!: string | null;

  @Column({ name: "search_query", type: "varchar", nullable: true })
  searchQuery!: string | null;

  @Column({ type: "integer", nullable: true })
  position!: number | null;

  @Column({ default: 1 })
  quantity!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
