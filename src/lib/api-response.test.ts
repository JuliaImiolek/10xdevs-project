import { describe, expect, it } from "vitest";
import { json } from "./api-response";

describe("json", () => {
  it("zwraca Response z Content-Type application/json", async () => {
    const res = json({ ok: true }, 200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("ustawia status", () => {
    expect(json({}, 200).status).toBe(200);
    expect(json({}, 201).status).toBe(201);
    expect(json({ error: "x" }, 400).status).toBe(400);
  });

  it("serializuje body do JSON", async () => {
    const body = { id: 1, name: "test" };
    const res = json(body, 200);
    await expect(res.json()).resolves.toEqual(body);
  });

  it("zachowuje dodatkowe nagłówki z init", () => {
    const res = json({}, 200, { headers: { "X-Custom": "value" } });
    expect(res.headers.get("X-Custom")).toBe("value");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
