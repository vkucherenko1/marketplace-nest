import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
} from "typeorm";

export class InitialAuthSchema1770800000000 implements MigrationInterface {
  name = "InitialAuthSchema1770800000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("users"))) {
      await queryRunner.createTable(
        new Table({
          name: "users",
          columns: [
            { name: "id", type: "uuid", isPrimary: true },
            { name: "email", type: "text", isUnique: true },
            { name: "display_name", type: "text" },
            { name: "password_hash", type: "text" },
            { name: "roles", type: "text", isArray: true },
            { name: "seller_id", type: "text", isNullable: true },
            { name: "first_name", type: "text", default: "''" },
            { name: "last_name", type: "text", default: "''" },
            { name: "middle_name", type: "text", isNullable: true },
            { name: "birth_date", type: "date", isNullable: true },
            { name: "phone", type: "text", isNullable: true },
            { name: "gender", type: "text", isNullable: true },
            { name: "city", type: "text", isNullable: true },
            { name: "address", type: "text", isNullable: true },
            { name: "avatar_url", type: "text", isNullable: true },
            {
              name: "created_at",
              type: "timestamptz",
              default: "now()",
            },
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable("refresh_sessions"))) {
      await queryRunner.createTable(
        new Table({
          name: "refresh_sessions",
          columns: [
            { name: "id", type: "uuid", isPrimary: true },
            { name: "user_id", type: "uuid" },
            { name: "token_hash", type: "text" },
            { name: "expires_at", type: "timestamptz" },
            { name: "revoked_at", type: "timestamptz", isNullable: true },
            {
              name: "created_at",
              type: "timestamptz",
              default: "now()",
            },
          ],
          foreignKeys: [
            {
              columnNames: ["user_id"],
              referencedTableName: "users",
              referencedColumnNames: ["id"],
              onDelete: "CASCADE",
            },
          ],
        }),
      );
      await queryRunner.createIndex(
        "refresh_sessions",
        new TableIndex({
          name: "refresh_sessions_user_idx",
          columnNames: ["user_id", "revoked_at"],
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("refresh_sessions", true);
    await queryRunner.dropTable("users", true);
  }
}
