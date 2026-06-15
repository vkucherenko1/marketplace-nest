import type { UserProfile, UserRole } from "@marketplace/contracts";
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
} from "typeorm";
import { RefreshSessionEntity } from "./refresh-session.entity";

@Entity({ name: "users" })
export class UserEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: "display_name" })
  displayName!: string;

  @Column({ name: "password_hash" })
  passwordHash!: string;

  @Column("text", { array: true })
  roles!: UserRole[];

  @Column({ name: "seller_id", type: "text", nullable: true })
  sellerId!: string | null;

  @Column({ name: "first_name", default: "" })
  firstName!: string;

  @Column({ name: "last_name", default: "" })
  lastName!: string;

  @Column({ name: "middle_name", type: "text", nullable: true })
  middleName!: string | null;

  @Column({ name: "birth_date", type: "date", nullable: true })
  birthDate!: string | null;

  @Column({ type: "text", nullable: true })
  phone!: string | null;

  @Column({ type: "text", nullable: true })
  gender!: UserProfile["gender"];

  @Column({ type: "text", nullable: true })
  city!: string | null;

  @Column({ type: "text", nullable: true })
  address!: string | null;

  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @OneToMany(() => RefreshSessionEntity, (session) => session.user)
  refreshSessions!: RefreshSessionEntity[];
}
