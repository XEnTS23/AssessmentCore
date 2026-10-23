import type { Dispatch, SetStateAction } from "react";
import { Input } from "../../../components/ui/input";
import type { EditorFormState } from "../fixing/manualFixEngine";

interface Props {
  editorState: EditorFormState;
  setEditorState: Dispatch<SetStateAction<EditorFormState | null>>;
}

export function ManualFixDetailsFields({ editorState, setEditorState }: Props) {
  const update = (changes: Partial<EditorFormState>) => {
    setEditorState((current) =>
      current ? { ...current, ...changes } : current,
    );
  };

  const updateMetadata = (
    field: keyof EditorFormState["metadata"],
    value: string,
  ) => {
    update({ metadata: { ...editorState.metadata, [field]: value } });
  };

  return (
    <>

      <div className="space-y-3 border-t pt-4">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Assessment settings
        </h5>
        <div className="grid grid-cols-3 gap-3">
          <NumberField
            label="Marks"
            value={editorState.marks}
            min={0.01}
            onChange={(value) => update({ marks: value ?? 0 })}
          />
          <NumberField
            label="Negative marks"
            value={editorState.negativeMarks}
            onChange={(value) => update({ negativeMarks: value })}
          />
          <NumberField
            label="Time limit (seconds)"
            value={editorState.timeLimitSeconds}
            min={1}
            onChange={(value) => update({ timeLimitSeconds: value })}
          />
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Question metadata
        </h5>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Question ID"
            value={editorState.metadata.questionId}
            onChange={(value) => updateMetadata("questionId", value)}
          />
          <TextField
            label="Language"
            value={editorState.metadata.language}
            onChange={(value) => updateMetadata("language", value)}
          />
          <TextField
            label="Subject"
            value={editorState.metadata.subject}
            onChange={(value) => updateMetadata("subject", value)}
          />
          <TextField
            label="Chapter"
            value={editorState.metadata.chapter}
            onChange={(value) => updateMetadata("chapter", value)}
          />
          <TextField
            label="Topic"
            value={editorState.metadata.topic}
            onChange={(value) => updateMetadata("topic", value)}
          />
          <TextField
            label="Difficulty"
            value={editorState.metadata.difficulty}
            onChange={(value) => updateMetadata("difficulty", value)}
          />
        </div>
      </div>
    </>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 text-sm"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value?: number;
  min?: number;
  onChange(value?: number): void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Input
        type="number"
        step="any"
        min={min}
        value={value ?? ""}
        onChange={(event) =>
          onChange(
            event.target.value === "" ? undefined : Number(event.target.value),
          )
        }
        className="h-9 text-sm"
      />
    </div>
  );
}
