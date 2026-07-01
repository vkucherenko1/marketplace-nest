import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import type { OrderStatus } from "@marketplace/contracts";
import { OrderLineEntity } from "./order-line.entity";

@Entity({ name: "orders" })
@Index("orders_buyer_created_idx", ["buyerId", "createdAt"])
@Index("orders_idempotency_idx", ["buyerId", "idempotencyKey"], { unique: true })
export class OrderEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ name: "buyer_id" })
  buyerId!: string;

  @Column({ name: "idempotency_key" })
  idempotencyKey!: string;

  @Column()
  status!: OrderStatus;

  @Column({ name: "total_minor" })
  totalMinor!: number;

  @Column({ default: "USD" })
  currency!: "USD";

  @Column({ name: "delivery_address" })
  deliveryAddress!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => OrderLineEntity, (line) => line.order)
  items!: OrderLineEntity[];
}
