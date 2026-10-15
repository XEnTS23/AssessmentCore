import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  from: vi.fn(),
}));

vi.mock("./supabaseClient", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: { getUser: supabaseMocks.getUser },
    storage: { from: supabaseMocks.from },
  },
}));

import {
  buildMediaStorageBasePath,
  uploadMediaFilesToSupabase,
} from "./mediaUploadService";

describe("mediaUploadService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    supabaseMocks.upload.mockResolvedValue({ error: null });
    supabaseMocks.getPublicUrl.mockImplementation((path: string) => ({
      data: {
        publicUrl: `https://example.supabase.co/storage/v1/object/public/question-media/${path}`,
      },
    }));
    supabaseMocks.from.mockReturnValue({
      upload: supabaseMocks.upload,
      getPublicUrl: supabaseMocks.getPublicUrl,
    });
  });

  it("builds an owner-scoped path required by Storage RLS", () => {
    expect(
      buildMediaStorageBasePath(
        "user-123",
        new Date("2026-08-16T12:34:56.789Z"),
      ),
    ).toBe("user-123/uploads/2026-08-16/2026-08-16T12-34-56-789Z");
  });

  it("uploads into the signed-in user's folder with a normalized extension", async () => {
    const uploaded = await uploadMediaFilesToSupabase(
      new Map([
        [
          "Graph.PNG",
          {
            filename: "Graph.PNG",
            data: new Uint8Array([1, 2, 3]),
            type: "image/png",
          },
        ],
      ]),
    );

    expect(supabaseMocks.getUser).toHaveBeenCalledOnce();
    expect(supabaseMocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(
        /^user-123\/uploads\/\d{4}-\d{2}-\d{2}\/.+\/001_Graph\.png$/,
      ),
      expect.any(Uint8Array),
      { contentType: "image/png", upsert: false },
    );
    expect(uploaded[0].storagePath).toMatch(/^user-123\/uploads\//);
  });

  it("rejects uploads when there is no authenticated user", async () => {
    supabaseMocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(
      uploadMediaFilesToSupabase(
        new Map([
          [
            "asset.png",
            {
              filename: "asset.png",
              data: new Uint8Array([1]),
              type: "image/png",
            },
          ],
        ]),
      ),
    ).rejects.toThrow("You must be signed in to upload media.");
    expect(supabaseMocks.upload).not.toHaveBeenCalled();
  });
});
