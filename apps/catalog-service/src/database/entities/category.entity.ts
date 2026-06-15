import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from "typeorm";
import { ProductEntity } from "./product.entity";

@Entity({ name: "categories" })
@Index("categories_parent_idx", ["parentId"])
export class CategoryEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ unique: true })
  slug!: string;

  @Column()
  name!: string;

  @Column({ name: "parent_id", type: "text", nullable: true })
  parentId!: string | null;

  @ManyToOne(() => CategoryEntity, (category) => category.children, {
    nullable: true,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "parent_id" })
  parent!: CategoryEntity | null;

  @OneToMany(() => CategoryEntity, (category) => category.parent)
  children!: CategoryEntity[];

  @OneToMany(() => ProductEntity, (product) => product.category)
  products!: ProductEntity[];
}
