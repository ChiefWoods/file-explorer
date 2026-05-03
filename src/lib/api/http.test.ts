import { HttpError, errorResponse, parseJsonBody } from "#/lib/api/http";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

describe("api/http helpers", () => {
  it("parses valid JSON bodies against schema", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "docs" }),
    });

    const parsed = await parseJsonBody(request, z.object({ name: z.string().min(1) }));
    expect(parsed).toEqual({ name: "docs" });
  });

  it("returns INVALID_JSON when body is not valid JSON", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{broken",
    });

    await expect(parseJsonBody(request, z.object({ name: z.string() }))).rejects.toMatchObject({
      status: 400,
      code: "INVALID_JSON",
    });
  });

  it("returns INVALID_INPUT when schema validation fails", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    await expect(
      parseJsonBody(request, z.object({ name: z.string().min(1) })),
    ).rejects.toMatchObject({
      status: 400,
      code: "INVALID_INPUT",
    });
  });

  it("serializes HttpError with status and details", async () => {
    const response = errorResponse(new HttpError(403, "FORBIDDEN", "No access.", { field: "id" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "FORBIDDEN",
        message: "No access.",
        details: { field: "id" },
      },
    });
  });

  it("serializes ZodError as INVALID_INPUT", async () => {
    const zodError = z.object({ name: z.string() }).safeParse({}).error;
    const response = errorResponse(zodError);

    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: { code: string; message: string } };
    expect(json.error.code).toBe("INVALID_INPUT");
    expect(json.error.message).toBe("Validation failed.");
  });

  it("returns INTERNAL_SERVER_ERROR for unknown errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = errorResponse(new Error("boom"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong.",
      },
    });
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
