import { z } from "zod";

export const PresignRequestSchema = z.object({
  contentType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  size: z
    .number()
    .int()
    .positive()
    .max(12 * 1024 * 1024, "max 12 MB"),
  filename: z.string().min(1).max(200).optional(),
});

export type PresignRequest = z.infer<typeof PresignRequestSchema>;

export const AutopsyRequestSchema = z.object({
  uploadId: z.string().min(1).max(300),
  symbol: z.string().min(1).max(32).optional(),
  timeframe: z.string().min(1).max(8).optional(),
  direction: z.enum(["LONG", "SHORT"]).optional(),
  notes: z.string().max(2000).optional(),
});

export type AutopsyRequestPayload = z.infer<typeof AutopsyRequestSchema>;

/** Convert a ZodError into a 400 Response with a flat error map. */
export function badRequest(error: z.ZodError) {
  return new Response(
    JSON.stringify({
      error: "bad_request",
      issues: error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    }),
    { status: 400, headers: { "content-type": "application/json" } },
  );
}
