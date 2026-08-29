import type {
  AuthoringSection,
  OptionalAuthoringSectionType,
} from "../core/authoringTypes";

export function moveAuthoringSection(
  sections: AuthoringSection[],
  sectionId: string,
  direction: -1 | 1,
): AuthoringSection[] {
  const fromIndex = sections.findIndex((section) => section.id === sectionId);
  const toIndex = fromIndex + direction;
  if (fromIndex < 0 || toIndex < 0 || toIndex >= sections.length) {
    return sections;
  }
  const next = [...sections];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function reorderAuthoringSections(
  sections: AuthoringSection[],
  sourceId: string,
  targetId: string,
): AuthoringSection[] {
  const fromIndex = sections.findIndex((section) => section.id === sourceId);
  const toIndex = sections.findIndex((section) => section.id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return sections;

  const next = [...sections];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function addOptionalAuthoringSection(
  sections: AuthoringSection[],
  type: OptionalAuthoringSectionType,
): AuthoringSection[] {
  if (sections.some((section) => section.type === type)) return sections;
  return [
    ...sections,
    {
      id: `${type}-${crypto.randomUUID()}`,
      type,
      content: "",
      conditionalFeedbackRules:
        type === "conditional_feedback" ? [] : undefined,
    },
  ];
}
