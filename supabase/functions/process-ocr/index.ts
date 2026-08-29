import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

class HttpError extends Error {
  status: number;
  details?: string;

  constructor(message: string, status = 400, details?: string) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const extractJsonObject = (content: string): Record<string, unknown> => {
  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Try to recover when model wraps JSON in markdown fences.
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch (e) {
        console.warn("Fenced JSON parse failed:", e);
      }
    }

    // Attempt to extract the outermost JSON object manually
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      } catch (e) {
        console.warn("Outermost JSON extract failed:", e);
      }
    }
  }

  throw new HttpError(
    "Model returned invalid JSON payload",
    502,
    content.slice(0, 1000),
  );
};

async function checkUnlimitedStatus(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.warn("No Authorization header found");
    return false;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  // Use SERVICE_ROLE_KEY for admin-level check to bypass RLS issues
  const supabaseAdminKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAdminKey) {
    console.error("Missing Supabase configuration env vars");
    return false;
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAdminKey);

  const jwt = authHeader.replace("Bearer ", "");

  // Decode JWT to get user_id without hitting the Auth API
  let userId: string | null = null;
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    userId = payload.sub;
  } catch (e) {
    console.error("Failed to decode JWT:", e.message);
    return false;
  }

  if (!userId) {
    console.warn("No user_id (sub) found in JWT payload");
    return false;
  }

  console.log(`Checking status for user ID: ${userId}`);

  const { data: usageData, error } = await supabaseClient
    .from("user_usage")
    .select("is_unlimited")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error(`Database error for user ${userId}:`, error.message);
    return false;
  }

  const result = !!usageData?.is_unlimited;
  console.log(`User ${userId} status: ${result ? "PREMIUM" : "FREE"}`);
  return result;
}

const MISTRAL_STANDARD_PROMPT = `You are a highly-specialized extraction engine for educational assessments targeting Bengali, Hindi, and English languages. 
Your goal is to parse unstructured images of tests and output strict JSON.
Flawlessly handle character encoding for Bengali and Hindi text mixed with English terminology.
Preserve all math natively as LaTeX. 

IMPORTANT MATH FORMATTING:
- For inline math, use single dollar signs: $...$
- For display/block math (equations on their own line), use double dollar signs: $$...$$
- NEVER use \\\\ before math delimiters or escape the dollar sign (do NOT output \\$). Treat $$ as the natural display delimiter.
- STRICT RULE: Do not over-escape LaTeX commands. Use standard JSON string escaping (e.g., "\\frac" or "\\int"). Never generate infinite or repeating backslashes.

Identify and structure Question Stems, Options, and Passages.

BOUNDING BOX REQUIREMENTS (CRITICAL):
- For EVERY question, you MUST provide "stem_box": [y_min, x_min, y_max, x_max] — the bounding box of the entire question text region (stem + options), normalized 0.0 to 1.0 relative to the image dimensions.
- If you see a standalone diagram/graph relevant to the question, provide a "diagrams" entry with "box": [y_min, x_min, y_max, x_max] (same coordinate system).
- y_min = top edge, y_max = bottom edge, x_min = left edge, x_max = right edge.
- These coordinates are essential for spatial mapping of diagrams to questions on multi-column layouts.

Output ONLY valid JSON matching this schema:
{
  "questions": [
    {
      "stem": "Text of the question in LaTeX format",
      "stem_box": [y_min, x_min, y_max, x_max],
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "diagrams": [
        { "box": [y_min, x_min, y_max, x_max], "description": "Short description" }
      ]
    }
  ]
}`;

const MISTRAL_TEXT_ONLY_PROMPT = `You are a highly-specialized extraction engine.
Your goal is to parse unstructured images of tests and output strict JSON.
Preserve all math natively as LaTeX (do not over-escape, use $$ for block math, $ for inline).

BOUNDING BOX REQUIREMENTS (CRITICAL):
- For EVERY question, you MUST provide "stem_box": [y_min, x_min, y_max, x_max].
- Ignore empty white spaces or blanked-out regions on the page.

Output ONLY valid JSON matching this schema:
{
  "questions": [
    {
      "stem": "Text of the question in LaTeX format",
      "stem_box": [y_min, x_min, y_max, x_max],
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"]
    }
  ]
}
// NOTICE: The "diagrams" array has been entirely deleted from the schema.
`;

const GEMINI_SYSTEM_PROMPT = `You are a highly-capable educational content extractor. You will be given raw text from an OCR process that may contain Bengali, Hindi, and English text.
Your task is to identify and structure questions and their options into a strict JSON format.

JSON SCHEMA:
{
  "questions": [
    {
      "stem": "The full text of the question. Use LaTeX for math ($...$).",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "diagrams": []
    }
  ]
}

RULES:
1. If the text is messy, use your intelligence to reconstruct the most likely question.
2. If there are NO questions at all in the text, return: { "questions": [] }
3. Always return valid JSON. Do not include any explanations.`;

interface ManualCrop {
  id: string;
  coordinates: [number, number, number, number]; // [y, x, h, w] in percentages
  type: "stem" | "option";
  optionLabel?: "A" | "B" | "C" | "D";
  /** 1-based question number for deterministic diagram assignment */
  questionNumber?: number;
}

// ── Step 1: Native Mistral OCR image coordinate types ────────────────────────

interface MistralNativeImage {
  id: string; // e.g. "img-0.jpeg"
  top_left_x: number; // pixel coordinates
  top_left_y: number;
  bottom_right_x: number;
  bottom_right_y: number;
}

interface PageDimensions {
  width: number;
  height: number;
  dpi: number;
}

// Axis-Aligned Bounding Box as [y_min, x_min, y_max, x_max], normalized 0..1
type AABB = [number, number, number, number];

// ── Step 1: Extract native image coordinates from Mistral OCR endpoint ───────

/**
 * Calls the Mistral Document OCR endpoint (/v1/ocr) to extract the `pages`
 * array. Returns:
 *  - Native image bounding boxes (for IoU matching)
 *  - Page dimensions
 *  - The markdown content (which has `![img-0.jpeg](img-0.jpeg)` placeholders
 *    at the correct reading-order positions within the text — this is the
 *    ground truth for determining which question an image belongs to)
 *
 * Falls back gracefully to empty results on any error.
 */
async function extractMistralNativeImages(
  imageBase64: string,
  apiKey: string,
): Promise<{
  images: MistralNativeImage[];
  dimensions: PageDimensions | null;
  markdown: string;
}> {
  try {
    const ocrResponse = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: {
          type: "image_url",
          image_url: `data:image/jpeg;base64,${imageBase64}`,
        },
        include_image_base64: false,
      }),
    });

    if (!ocrResponse.ok) {
      console.warn(
        "Mistral OCR endpoint failed, falling back:",
        await ocrResponse.text().catch(() => "(no body)"),
      );
      return { images: [], dimensions: null, markdown: "" };
    }

    const ocrResult = await ocrResponse.json();
    const page = ocrResult?.pages?.[0];
    if (!page) return { images: [], dimensions: null, markdown: "" };

    const images: MistralNativeImage[] = (page.images || []).map(
      (img: any) => ({
        id: img.id || "",
        top_left_x: img.top_left_x ?? 0,
        top_left_y: img.top_left_y ?? 0,
        bottom_right_x: img.bottom_right_x ?? 0,
        bottom_right_y: img.bottom_right_y ?? 0,
      }),
    );

    const dimensions: PageDimensions | null = page.dimensions
      ? {
          width: page.dimensions.width,
          height: page.dimensions.height,
          dpi: page.dimensions.dpi || 72,
        }
      : null;

    const markdown: string = page.markdown || "";

    return { images, dimensions, markdown };
  } catch (err) {
    console.warn("extractMistralNativeImages error (non-fatal):", err);
    return { images: [], dimensions: null, markdown: "" };
  }
}

// ── Step 2: Intersection over Union (IoU) ────────────────────────────────────

/**
 * Calculates the Intersection over Union (IoU) ratio for two axis-aligned
 * bounding boxes expressed as [y_min, x_min, y_max, x_max] (normalized 0..1).
 *
 * Returns a value in [0, 1] where 0 = no overlap, 1 = identical boxes.
 */
function calculateIoU(boxA: AABB, boxB: AABB): number {
  // Intersection rectangle
  const interYMin = Math.max(boxA[0], boxB[0]);
  const interXMin = Math.max(boxA[1], boxB[1]);
  const interYMax = Math.min(boxA[2], boxB[2]);
  const interXMax = Math.min(boxA[3], boxB[3]);

  const interWidth = Math.max(0, interXMax - interXMin);
  const interHeight = Math.max(0, interYMax - interYMin);
  const interArea = interWidth * interHeight;

  if (interArea === 0) return 0;

  // Areas of each box
  const areaA = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]);
  const areaB = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]);

  const unionArea = areaA + areaB - interArea;
  if (unionArea <= 0) return 0;

  return interArea / unionArea;
}

/**
 * Convert a Mistral native image (pixel coords) to a normalized AABB [0..1].
 */
function mistralImageToAABB(
  img: MistralNativeImage,
  dim: PageDimensions,
): AABB {
  return [
    img.top_left_y / dim.height,
    img.top_left_x / dim.width,
    img.bottom_right_y / dim.height,
    img.bottom_right_x / dim.width,
  ];
}

/**
 * Convert a manual crop (percentage coords [y, x, h, w]) to a normalized AABB.
 */
function cropToAABB(crop: ManualCrop): AABB {
  const [yP, xP, hP, wP] = crop.coordinates;
  return [yP / 100, xP / 100, (yP + hP) / 100, (xP + wP) / 100];
}

/**
 * Match a user's manual crop to the Mistral native image with the highest IoU.
 * Returns the matched image `id` and the IoU score, or null if no images exist.
 */
function matchCropToMistralImage(
  crop: ManualCrop,
  nativeImages: MistralNativeImage[],
  dim: PageDimensions,
): { matchedId: string; iou: number } | null {
  if (nativeImages.length === 0) return null;

  const cropBox = cropToAABB(crop);
  let bestId = "";
  let bestIoU = -1;

  for (const img of nativeImages) {
    const imgBox = mistralImageToAABB(img, dim);
    const iou = calculateIoU(cropBox, imgBox);
    if (iou > bestIoU) {
      bestIoU = iou;
      bestId = img.id;
    }
  }

  return bestIoU > 0 ? { matchedId: bestId, iou: bestIoU } : null;
}

// ── Step 3: Spatial sorting ──────────────────────────────────────────────────

interface SortableElement {
  index: number;
  y_min: number;
  x_min: number;
}

/**
 * Sort elements into natural reading order: top-to-bottom, left-to-right.
 * Elements within the same horizontal band (±tolerance) are sorted by X.
 */
function spatialSortElements<T extends SortableElement>(
  elements: T[],
  yTolerance = 0.02,
): T[] {
  return [...elements].sort((a, b) => {
    // If they're in roughly the same row, sort by X
    if (Math.abs(a.y_min - b.y_min) < yTolerance) {
      return a.x_min - b.x_min;
    }
    return a.y_min - b.y_min;
  });
}

/**
 * ─── MARKDOWN-AWARE IMAGE→QUESTION MATCHING ──────────────────────────────────
 *
 * The Mistral OCR endpoint returns markdown with image placeholders at their
 * exact position in the reading flow:
 *
 *   "1. What is the capital of India?\n(A) Kolkata (B) Delhi...\n
 *    2. How many bones...\n
 *    3. What is gravity?\n![img-0.jpeg](img-0.jpeg)\n
 *    4. Define momentum..."
 *
 * By finding where `![img-0.jpeg]` appears in this text, we know it belongs
 * to Question 3. We then fuzzy-match "What is gravity?" to Pixtral's
 * question stems to find the correct array index.
 *
 * This approach is independent of stem_box accuracy and works even when
 * Pixtral returns wrong/missing bounding boxes.
 */

/**
 * Given a native image id (e.g. "img-0.jpeg") and the OCR markdown,
 * extract the text that appears BEFORE the image. This text is the
 * "context" that identifies which question the image belongs to.
 * We grab the last meaningful text block before the image placeholder.
 */
function getTextContextBeforeImage(imageId: string, markdown: string): string {
  const placeholder = `![${imageId}](${imageId})`;
  const pos = markdown.indexOf(placeholder);
  if (pos < 0) {
    // Also try without the alt text
    const altPlaceholder = `(${imageId})`;
    const altPos = markdown.indexOf(altPlaceholder);
    if (altPos < 0) return "";
    const before = markdown.slice(Math.max(0, altPos - 500), altPos);
    return before.trim();
  }

  // Take the text before the image placeholder (last 500 chars max)
  const before = markdown.slice(Math.max(0, pos - 500), pos);
  return before.trim();
}

/**
 * Compute a simple text-overlap similarity score between two strings.
 * Uses word-level Jaccard similarity (case-insensitive).
 * Returns a value in [0, 1].
 */
function textSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const wordsA = new Set(
    a
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
  const wordsB = new Set(
    b
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Find which Pixtral question best matches a given OCR text context.
 * Returns the question index with the highest text similarity.
 */
function matchContextToQuestion(
  context: string,
  questions: any[],
): { index: number; similarity: number } {
  let bestIndex = 0;
  let bestSim = -1;

  for (let i = 0; i < questions.length; i++) {
    const stem = questions[i].stem || "";
    const sim = textSimilarity(context, stem);
    if (sim > bestSim) {
      bestSim = sim;
      bestIndex = i;
    }
  }

  return { index: bestIndex, similarity: bestSim };
}

/**
 * Primary matching function: determines which question owns a crop.
 *
 * Strategy priority:
 *   1. Markdown-aware: IoU match crop → native image → OCR text context → question
 *   2. Zone-based fallback: use stem_box zones if markdown matching fails
 */
function findOwnerQuestion(
  crop: ManualCrop,
  cropBox: AABB,
  questions: any[],
  nativeImages: MistralNativeImage[],
  pageDimensions: PageDimensions | null,
  ocrMarkdown: string,
): number {
  if (questions.length === 0) return 0;
  if (questions.length === 1) return 0;

  // ─── Strategy 1: Markdown-aware matching ─────────────────────────────────
  if (nativeImages.length > 0 && pageDimensions && ocrMarkdown) {
    const iouMatch = matchCropToMistralImage(
      crop,
      nativeImages,
      pageDimensions,
    );

    if (iouMatch && iouMatch.iou > 0.05) {
      console.log(
        `[Markdown Match] Crop ${crop.id} ↔ native image "${iouMatch.matchedId}" (IoU=${iouMatch.iou.toFixed(3)})`,
      );

      // Get the text that appears before this image in the OCR markdown
      const textContext = getTextContextBeforeImage(
        iouMatch.matchedId,
        ocrMarkdown,
      );

      if (textContext) {
        console.log(
          `[Markdown Match] Text context before image: "${textContext.slice(-120)}"`,
        );

        // Find the question whose stem best matches this text context
        const match = matchContextToQuestion(textContext, questions);
        console.log(
          `[Markdown Match] Best matching question: Q${match.index} (similarity=${match.similarity.toFixed(3)}, stem="${(questions[match.index]?.stem || "").slice(0, 60)}")`,
        );

        if (match.similarity > 0.1) {
          console.log(
            `[Markdown Match] ✓ Assigned crop ${crop.id} → Q${match.index} via OCR markdown context`,
          );
          return match.index;
        } else {
          console.log(
            `[Markdown Match] Low similarity (${match.similarity.toFixed(3)}), trying text-before-last-question approach...`,
          );

          // Alternative: count how many question-like patterns appear before the image
          // This works for numbered questions (1., 2., Q3, etc.)
          const textBeforeImage = ocrMarkdown.slice(
            0,
            ocrMarkdown.indexOf(`${iouMatch.matchedId}`),
          );
          const questionPatterns = textBeforeImage.match(
            /(?:^|\n)\s*(?:Q\.?\s*)?(\d+)\s*[.):\s]/gm,
          );
          if (questionPatterns && questionPatterns.length > 0) {
            const lastQNum = parseInt(
              questionPatterns[questionPatterns.length - 1].replace(/\D/g, ""),
            );
            // Question numbers are 1-based, indices are 0-based
            const targetIdx = Math.min(lastQNum - 1, questions.length - 1);
            if (targetIdx >= 0) {
              console.log(
                `[Markdown Match] ✓ Found ${questionPatterns.length} question numbers before image, last = ${lastQNum} → Q${targetIdx}`,
              );
              return targetIdx;
            }
          }
        }
      }
    }
  }

  // ─── Strategy 2: Zone-based fallback ─────────────────────────────────────
  console.log(`[Zone Fallback] Using stem_box zones for crop ${crop.id}`);

  interface QZone {
    index: number;
    y_min: number;
    y_max: number;
    x_min: number;
  }

  const elements: QZone[] = questions.map((q: any, idx: number) => ({
    index: idx,
    y_min: q.stem_box?.[0] ?? 0,
    y_max: q.stem_box?.[2] ?? 1,
    x_min: q.stem_box?.[1] ?? 0,
  }));

  const sorted = [...elements].sort((a, b) => {
    if (Math.abs(a.y_min - b.y_min) < 0.02) return a.x_min - b.x_min;
    return a.y_min - b.y_min;
  });

  const cropCenterY = (cropBox[0] + cropBox[2]) / 2;

  for (let i = sorted.length - 1; i >= 0; i--) {
    const zoneStart = sorted[i].y_min;
    const zoneEnd = i < sorted.length - 1 ? sorted[i + 1].y_min : 1.0;
    if (cropCenterY >= zoneStart && cropCenterY < zoneEnd) {
      console.log(
        `[Zone Fallback] → Q${sorted[i].index} via zone [${zoneStart.toFixed(3)}, ${zoneEnd.toFixed(3)})`,
      );
      return sorted[i].index;
    }
  }

  // Absolute fallback
  return 0;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      imageBase64,
      filename,
      manualCrops = [],
    } = (await req.json()) as {
      imageBase64: string;
      filename: string;
      manualCrops: ManualCrop[];
    };

    if (!imageBase64) {
      throw new HttpError("Missing image content", 400);
    }

    const isUnlimited = await checkUnlimitedStatus(req);

    if (isUnlimited) {
      // Premium user -> Use Mistral Pixtral OCR
      const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
      if (!MISTRAL_API_KEY) {
        throw new HttpError(
          "Missing MISTRAL_API_KEY environment variable",
          500,
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseAdminKey =
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
        Deno.env.get("SUPABASE_ANON_KEY");
      const supabaseAdmin = createClient(supabaseUrl!, supabaseAdminKey!);

      let finalImageBase64 = imageBase64;
      const uploadedManualCrops: Array<ManualCrop & { publicUrl: string }> = [];

      if (manualCrops.length > 0) {
        try {
          const img = await Image.decode(
            Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0)),
          );
          for (const crop of manualCrops) {
            const [yP, xP, hP, wP] = crop.coordinates;
            const x = Math.floor((xP / 100) * img.width);
            const y = Math.floor((yP / 100) * img.height);
            const w = Math.max(1, Math.floor((wP / 100) * img.width));
            const h = Math.max(1, Math.floor((hP / 100) * img.height));
            const croppedImg = img.clone().crop(x, y, w, h);
            const croppedBytes = await croppedImg.encodeJPEG(90);
            const filePath = `manual_crops/${crypto.randomUUID()}.jpg`;
            await supabaseAdmin.storage
              .from("ocr-diagrams")
              .upload(filePath, croppedBytes, { contentType: "image/jpeg" });
            const {
              data: { publicUrl },
            } = supabaseAdmin.storage
              .from("ocr-diagrams")
              .getPublicUrl(filePath);
            uploadedManualCrops.push({ ...crop, publicUrl });
            const whiteBox = new Image(w, h).fill(0xffffffff);
            img.composite(whiteBox, x, y);
          }
          const redactedBytes = await img.encodeJPEG(85);
          const chunks: string[] = [];
          const chunkSize = 8192;
          for (let i = 0; i < redactedBytes.length; i += chunkSize) {
            chunks.push(
              String.fromCharCode.apply(
                null,
                Array.from(redactedBytes.subarray(i, i + chunkSize)),
              ),
            );
          }
          finalImageBase64 = btoa(chunks.join(""));
        } catch (imgErr) {
          console.warn("Redaction failed:", imgErr);
        }
      }

      const systemPrompt =
        manualCrops.length > 0
          ? MISTRAL_TEXT_ONLY_PROMPT
          : MISTRAL_STANDARD_PROMPT;
      const mistralResponse = await fetch(
        "https://api.mistral.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${MISTRAL_API_KEY}`,
          },
          body: JSON.stringify({
            model: "pixtral-12b-2409",
            temperature: 0.2,
            max_tokens: 4000,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${finalImageBase64}`,
                    },
                  },
                ],
              },
            ],
            response_format: { type: "json_object" },
          }),
        },
      );

      if (!mistralResponse.ok) {
        const err = await mistralResponse.text();
        throw new HttpError(`Mistral failed`, 502, err.slice(0, 1000));
      }

      const result = await mistralResponse.json();
      const content = result?.choices?.[0]?.message?.content;
      if (!content) throw new HttpError("Mistral returned no content", 502);

      const parsedData = extractJsonObject(content);

      // ── IoU-based diagram matching pipeline (replaces old 2D proximity) ───
      if (
        uploadedManualCrops.length > 0 &&
        Array.isArray(parsedData.questions)
      ) {
        // Repair missing or invalid stem_boxes before sorting
        const totalQ = parsedData.questions.length;
        parsedData.questions.forEach((q: any, idx: number) => {
          if (!q.stem_box || typeof q.stem_box[0] !== "number") {
            q.stem_box = [idx / totalQ, 0, (idx + 1) / totalQ, 1];
          }
        });

        // Step 1: Extract native image coordinates + markdown from Mistral OCR endpoint
        // NOTE: We use the ORIGINAL (non-redacted) image so the OCR sees diagrams in context
        const {
          images: nativeImages,
          dimensions: pageDimensions,
          markdown: ocrMarkdown,
        } = await extractMistralNativeImages(imageBase64, MISTRAL_API_KEY);

        console.log(
          `[IoU Pipeline] Native images found: ${nativeImages.length}, dimensions: ${JSON.stringify(pageDimensions)}`,
        );
        console.log(
          `[IoU Pipeline] OCR markdown length: ${ocrMarkdown.length} chars`,
        );
        if (ocrMarkdown) {
          console.log(
            `[IoU Pipeline] OCR markdown preview: "${ocrMarkdown.slice(0, 300)}..."`,
          );
        }

        // Attach native coordinate metadata to the response for client-side use
        (parsedData as any).mistral_native_images = nativeImages;
        (parsedData as any).page_dimensions = pageDimensions;

        // Log all question stem_boxes for debugging
        const questions = parsedData.questions;
        console.log(
          `[IoU Pipeline] ${questions.length} questions detected. Stem boxes:`,
        );
        questions.forEach((q: any, i: number) => {
          const box = q.stem_box;
          console.log(
            `  Q${i}: stem_box=[${box.map((v: number) => v.toFixed(3)).join(", ")}] stem="${(q.stem || "").slice(0, 60)}..."`,
          );
        });

        // Log all crop coordinates
        console.log(
          `[IoU Pipeline] ${uploadedManualCrops.length} manual crops:`,
        );
        uploadedManualCrops.forEach((c: any) => {
          const aabb = cropToAABB(c);
          console.log(
            `  Crop ${c.id} (${c.type}): coords=[${c.coordinates.join(",")}] → AABB=[${aabb.map((v) => v.toFixed(3)).join(", ")}] center_y=${((aabb[0] + aabb[2]) / 2).toFixed(3)}`,
          );
        });

        // Step 2: Match each crop to the correct question using markdown-aware matching
        uploadedManualCrops.forEach((crop) => {
          const cropBox = cropToAABB(crop);

          // ── Deterministic assignment: use user-specified Q number if available ──
          let bestMatchIndex: number;
          if (
            typeof crop.questionNumber === "number" &&
            crop.questionNumber >= 1
          ) {
            bestMatchIndex = Math.min(
              crop.questionNumber - 1,
              questions.length - 1,
            );
            console.log(
              `[Direct Assignment] Crop ${crop.id} → Q${bestMatchIndex} (user specified Q${crop.questionNumber})`,
            );
          } else {
            // Fallback to heuristic matching (markdown-aware → zone-based)
            bestMatchIndex = findOwnerQuestion(
              crop,
              cropBox,
              questions,
              nativeImages,
              pageDimensions,
              ocrMarkdown,
            );
          }

          console.log(
            `[IoU Pipeline] Crop ${crop.id} (type=${crop.type}) -> Question index ${bestMatchIndex}`,
          );

          const targetQ = questions[bestMatchIndex];
          if (!targetQ) return;

          if (crop.type === "stem") {
            targetQ.media_url = crop.publicUrl;

            if (!targetQ.diagrams) targetQ.diagrams = [];
            targetQ.diagrams.push({
              url: crop.publicUrl,
              description: "Manually selected diagram",
              box: [
                crop.coordinates[0] / 100,
                crop.coordinates[1] / 100,
                (crop.coordinates[0] + crop.coordinates[2]) / 100,
                (crop.coordinates[1] + crop.coordinates[3]) / 100,
              ],
            });
            // Append the image link to the question stem
            targetQ.stem =
              `${targetQ.stem || ""} [MEDIA:${crop.publicUrl}]`.trim();
          } else if (crop.type === "option" && crop.optionLabel) {
            const optIdx = crop.optionLabel.charCodeAt(0) - 65;
            if (targetQ.options && Array.isArray(targetQ.options)) {
              targetQ.options[optIdx] =
                `${targetQ.options[optIdx] || ""} [MEDIA:${crop.publicUrl}]`.trim();
            }
          }
        });
      }

      return new Response(JSON.stringify(parsedData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Free user path
      console.log(
        "Processing as FREE user (either not unlimited or check failed)",
      );
      const OCR_SPACE_API_KEY =
        Deno.env.get("OCR_SPACE_API_KEY") || "helloworld";

      const formData = new FormData();
      formData.append("apikey", OCR_SPACE_API_KEY);
      formData.append("base64Image", `data:image/jpeg;base64,${imageBase64}`);
      formData.append("language", "auto");
      formData.append("OCREngine", "2");
      formData.append("scale", "true");

      const ocrSpaceResponse = await fetch(
        "https://api.ocr.space/parse/image",
        {
          method: "POST",
          body: formData,
        },
      );

      if (!ocrSpaceResponse.ok) {
        const err = await ocrSpaceResponse.text();
        throw new HttpError(
          `OCR.space failed (status ${ocrSpaceResponse.status})`,
          502,
          err.slice(0, 1000),
        );
      }

      const ocrResult = await ocrSpaceResponse.json();

      if (ocrResult.IsErroredOnProcessing) {
        const errorMsg =
          ocrResult.ErrorMessage?.[0] || "Unknown OCR.space error";
        throw new HttpError(`OCR.space failed: ${errorMsg}`, 502);
      }

      const parsedText = ocrResult?.ParsedResults?.[0]?.ParsedText || "";
      console.log("Raw OCR Text Length:", parsedText.length);

      if (parsedText.trim().length < 5) {
        return new Response(JSON.stringify({ questions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Restructure with OpenRouter (Free Model)
      const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
      if (!OPENROUTER_API_KEY) {
        throw new HttpError(
          "Missing OPENROUTER_API_KEY environment variable",
          500,
        );
      }

      const openRouterResponse = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://assessment-core.vercel.app", // Change to your actual URL
            "X-Title": "AssessmentCore",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.1-8b-instruct:free",
            messages: [
              { role: "system", content: GEMINI_SYSTEM_PROMPT },
              {
                role: "user",
                content: `Restructure this raw OCR text into JSON. Languages: Bengali, Hindi, English.\n\nRAW OCR CONTENT:\n${parsedText}`,
              },
            ],
            temperature: 0.1,
          }),
        },
      );

      if (!openRouterResponse.ok) {
        const err = await openRouterResponse.text();
        throw new HttpError(
          `OpenRouter failed (status ${openRouterResponse.status})`,
          502,
          err.slice(0, 1000),
        );
      }

      const openRouterResult = await openRouterResponse.json();
      const openRouterContent = openRouterResult.choices?.[0]?.message?.content;

      if (!openRouterContent) {
        console.error(
          "OpenRouter Full Response:",
          JSON.stringify(openRouterResult),
        );
        throw new HttpError(
          "OpenRouter returned no content. Check logs for details.",
          502,
        );
      }

      const parsedData = extractJsonObject(openRouterContent);
      return new Response(JSON.stringify(parsedData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error("Error in process-ocr:", error);
    const typedError =
      error instanceof HttpError
        ? error
        : new HttpError(
            error instanceof Error ? error.message : "Unknown error",
            500,
          );

    return new Response(
      JSON.stringify({
        error: typedError.message,
        details: typedError.details,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: typedError.status,
      },
    );
  }
});
