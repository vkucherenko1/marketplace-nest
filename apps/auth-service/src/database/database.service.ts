import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { hash } from "@node-rs/argon2";
import { Repository } from "typeorm";
import { UserEntity } from "./entities/user.entity";

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Seed выполняется через ORM и не перезаписывает профиль, который пользователь
    // уже изменил в личном кабинете.
    const passwordHash = await hash("Marketplace123!");
    const demoUsers: Array<Partial<UserEntity> & Pick<UserEntity, "id" | "email">> = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        email: "admin@market.local",
        displayName: "Администратор",
        roles: ["ADMIN"],
        sellerId: null,
        firstName: "Администратор",
        lastName: "Системы",
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        email: "moderator@market.local",
        displayName: "Модератор",
        roles: ["MODERATOR"],
        sellerId: null,
        firstName: "Мария",
        lastName: "Модератор",
      },
      {
        id: "00000000-0000-4000-8000-000000000003",
        email: "buyer@market.local",
        displayName: "Анна Покупатель",
        roles: ["BUYER"],
        sellerId: null,
        firstName: "Анна",
        lastName: "Покупатель",
      },
      {
        id: "00000000-0000-4000-8000-000000000004",
        email: "seller1@market.local",
        displayName: "TechNova",
        roles: ["SELLER"],
        sellerId: "seller-1",
        firstName: "Иван",
        lastName: "Продавец",
      },
    ];

    for (const demoUser of demoUsers) {
      const existing = await this.users.findOneBy({ email: demoUser.email });
      if (!existing) {
        await this.users.save(
          this.users.create({
            ...demoUser,
            passwordHash,
          }),
        );
      }
    }
  }
}
