import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { ProductEntity } from "./product.entity";

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity({ name: "sellers" })
export class SellerEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  name!: string;

  @Column("numeric", {
    precision: 3,
    scale: 2,
    transformer: numericTransformer,
  })
  rating!: number;

  @Column({ name: "review_count" })
  reviewCount!: number;

  @OneToMany(() => ProductEntity, (product) => product.seller)
  products!: ProductEntity[];
}
