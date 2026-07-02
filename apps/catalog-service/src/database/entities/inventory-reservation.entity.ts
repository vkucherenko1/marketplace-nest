import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

export type InventoryReservationStatus =
  | "ACTIVE"
  | "CONFIRMED"
  | "RELEASED"
  | "EXPIRED";

@Entity({ name: "inventory_reservations" })
@Index("inventory_reservations_order_idx", ["orderId"])
@Index("inventory_reservations_expiry_idx", ["status", "expiresAt"])
export class InventoryReservationEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ name: "order_id" })
  orderId!: string;

  @Column({ name: "product_id" })
  productId!: string;

  @Column({ name: "variant_id", type: "varchar", nullable: true })
  variantId!: string | null;

  @Column()
  quantity!: number;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ default: "ACTIVE" })
  status!: InventoryReservationStatus;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
