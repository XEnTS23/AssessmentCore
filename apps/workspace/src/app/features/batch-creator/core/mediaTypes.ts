export type MediaRole =
  | "question_stem"
  | "option"
  | "explanation"
  | "passage"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "feedback_correct"
  | "feedback_incorrect"
  | "conditional_feedback"
  | "feedback_partial"
  | "hint"
  | "instructions";
export type MediaContentType =
  | "image"
  | "graph"
  | "diagram"
  | "equation_image"
  | "audio"
  | "video"
  | "document";

export interface MediaReference {
  id: string;
  publicUrlSource: string;
  resolvedUrl?: string;
  role: MediaRole;
  status: "pending" | "resolved" | "failed";
  altText?: string;
  contentType?: MediaContentType;
  ownerId?: string;
}
