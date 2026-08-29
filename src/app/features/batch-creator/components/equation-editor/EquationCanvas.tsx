import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
import type { MathfieldElement } from "mathlive";
import "mathlive";

export interface EquationCanvasHandle {
  getValue: () => string;
  setValue: (latex: string) => void;
  insert: (latex: string) => void;
  executeCommand: (command: string | string[]) => void;
  focus: () => void;
  hasFocus: () => boolean;
}

interface Props {
  value: string;
  onChange: (latex: string) => void;
  displayMode?: "inline" | "block";
  readOnly?: boolean;
  className?: string;
}

export const EquationCanvas = forwardRef<EquationCanvasHandle, Props>(
  function EquationCanvas({ value, onChange, readOnly = false, className = "" }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mfRef = useRef<MathfieldElement | null>(null);
    const isInternalUpdate = useRef(false);

    // Create MathfieldElement on mount
    useEffect(() => {
      if (!containerRef.current) return;

      const mf = new (customElements.get("math-field") as unknown as { new (): MathfieldElement })() as MathfieldElement;
      
      // Basic configuration
      mf.smartMode = true;
      mf.smartFence = true;
      mf.smartSuperscript = true;
      mf.readOnly = readOnly;
      
      // Theme-consistent styling via inline CSS
      mf.style.cssText = `
        display: block;
        width: 100%;
        height: 100%;
        min-height: 120px;
        font-size: 22px;
        background: transparent;
        border: none;
        outline: none;
        padding: 24px;
        color: var(--foreground);
        --caret-color: var(--foreground);
        --selection-background-color: var(--accent);
        --selection-color: var(--foreground);
        --placeholder-color: var(--muted-foreground);
        --contains-highlight-background-color: transparent;
        --smart-fence-color: var(--foreground);
        --highlight-inactive-color: transparent;
        --text-font-family: var(--font-sans);
      `;

      // Set initial value
      if (value) {
        mf.setValue(value);
      }

      // Listen for input changes
      mf.addEventListener("input", () => {
        isInternalUpdate.current = true;
        const latex = mf.getValue("latex");
        onChange(latex);
        requestAnimationFrame(() => {
          isInternalUpdate.current = false;
        });
      });

      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(mf);
      mfRef.current = mf;

      // Auto-focus
      requestAnimationFrame(() => {
        mf.focus();
      });

      return () => {
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
        mfRef.current = null;
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync value prop -> MathLive (only from external updates)
    useEffect(() => {
      const mf = mfRef.current;
      if (!mf || isInternalUpdate.current) return;
      
      const currentVal = mf.getValue("latex");
      if (currentVal !== value) {
        mf.setValue(value);
      }
    }, [value]);

    // Sync readOnly
    useEffect(() => {
      if (mfRef.current) {
        mfRef.current.readOnly = readOnly;
      }
    }, [readOnly]);

    // Expose imperative methods
    useImperativeHandle(ref, () => ({
      getValue: () => mfRef.current?.getValue("latex") ?? "",
      setValue: (latex: string) => {
        if (mfRef.current) {
          mfRef.current.setValue(latex);
        }
      },
      insert: (latex: string) => {
        if (mfRef.current) {
          mfRef.current.insert(latex, { focus: true });
        }
      },
      executeCommand: (command: string | string[]) => {
        if (mfRef.current) {
          mfRef.current.executeCommand(command as any);
        }
      },
      focus: () => {
        mfRef.current?.focus();
      },
      hasFocus: () => {
        return document.activeElement === mfRef.current || 
               (mfRef.current?.contains(document.activeElement) ?? false);
      },
    }), []);

    return (
      <div
        ref={containerRef}
        className={`flex-1 overflow-auto bg-card ${className}`}
        aria-label="Equation editing canvas"
      />
    );
  }
);
