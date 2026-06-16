const assert = require("node:assert/strict");
const test = require("node:test");
const { createHash } = require("node:crypto");
const { hash } = require("@node-rs/argon2");
const { AuthService } = require("../dist/auth/auth.service.js");

function createUser(passwordHash) {
  return {
    id: "user-1",
    email: "buyer@market.local",
    displayName: "Анна Покупатель",
    passwordHash,
    roles: ["BUYER"],
    sellerId: null,
    firstName: "Анна",
    lastName: "Покупатель",
    middleName: null,
    birthDate: null,
    phone: null,
    gender: null,
    city: null,
    address: null,
    avatarUrl: null,
  };
}

function createJwt(overrides = {}) {
  return {
    async signAsync(payload) {
      return payload.type === "access" ? "access-token" : "refresh-token";
    },
    async verifyAsync() {
      return { sub: "user-1", sid: "session-1", type: "refresh" };
    },
    ...overrides,
  };
}

test("login создаёт сессию и возвращает пару токенов", async () => {
  const user = createUser(await hash("Marketplace123!"));
  let createdSession;
  const users = {
    findByEmail: async (email) => (email === user.email ? user : null),
    createSession: async (session) => {
      createdSession = session;
    },
  };
  const service = new AuthService(users, createJwt());

  const result = await service.login(user.email, "Marketplace123!");

  assert.equal(result.accessToken, "access-token");
  assert.equal(result.refreshToken, "refresh-token");
  assert.deepEqual(result.user.roles, ["BUYER"]);
  assert.equal(
    createdSession.tokenHash,
    createHash("sha256").update("refresh-token").digest("hex"),
  );
  assert.equal(createdSession.userId, user.id);
});

test("login отклоняет неверный пароль", async () => {
  const user = createUser(await hash("Marketplace123!"));
  const service = new AuthService(
    {
      findByEmail: async () => user,
    },
    createJwt(),
  );

  await assert.rejects(
    service.login(user.email, "wrong-password"),
    (error) => error.getStatus() === 401,
  );
});

test("повторно использованный refresh-токен отзывает сессию", async () => {
  const user = createUser("unused");
  let revokedSession = null;
  const service = new AuthService(
    {
      findById: async () => user,
      rotateSession: async () => false,
      revokeSession: async (id) => {
        revokedSession = id;
      },
    },
    createJwt(),
  );

  await assert.rejects(
    service.refresh("already-used-token"),
    (error) => error.getStatus() === 401,
  );
  assert.equal(revokedSession, "session-1");
});

test("profile возвращает полный профиль и скрывает passwordHash", async () => {
  const user = createUser("secret-hash");
  const service = new AuthService(
    { findById: async () => user },
    createJwt(),
  );

  const profile = await service.profile(user.id);

  assert.equal(profile.firstName, "Анна");
  assert.equal("passwordHash" in profile, false);
});

test("только администратор может получить список пользователей", async () => {
  const service = new AuthService(
    {
      list: async () => ({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 }),
    },
    createJwt(),
  );

  await assert.rejects(
    service.adminUsers({ sub: "buyer-1", roles: ["BUYER"] }, 1, 20),
    (error) => error.getStatus() === 403,
  );
  const result = await service.adminUsers(
    { sub: "admin-1", roles: ["ADMIN"] },
    1,
    20,
  );
  assert.equal(result.total, 0);
});

test("администратор не может снять собственную роль ADMIN", async () => {
  const admin = {
    ...createUser("unused"),
    id: "admin-1",
    roles: ["ADMIN"],
  };
  const service = new AuthService(
    {
      findById: async () => admin,
      updateRoles: async () => {
        throw new Error("updateRoles should not be called");
      },
    },
    createJwt(),
  );

  await assert.rejects(
    service.updateUserRoles(
      { sub: admin.id, roles: ["ADMIN"] },
      admin.id,
      ["BUYER"],
    ),
    (error) => error.getStatus() === 400,
  );
});

test("администратор может изменить роли другого пользователя", async () => {
  const moderator = {
    ...createUser("unused"),
    id: "moderator-1",
    roles: ["MODERATOR"],
  };
  let savedRoles = null;
  const service = new AuthService(
    {
      findById: async () => moderator,
      updateRoles: async (_id, roles) => {
        savedRoles = roles;
        return { ...moderator, roles };
      },
    },
    createJwt(),
  );

  const updated = await service.updateUserRoles(
    { sub: "admin-1", roles: ["ADMIN"] },
    moderator.id,
    ["MODERATOR", "BUYER"],
  );

  assert.deepEqual(savedRoles, ["MODERATOR", "BUYER"]);
  assert.deepEqual(updated.roles, ["MODERATOR", "BUYER"]);
});
