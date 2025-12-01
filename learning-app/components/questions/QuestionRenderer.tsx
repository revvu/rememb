"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Check, X, GripVertical } from "lucide-react";

export interface Problem {
  id: string;
  type: string;
  text: string;
  difficulty: string;
  options?: string[];
  columnA?: string[];
  columnB?: string[];
  correctAnswer?: number | number[] | boolean;
}

interface QuestionRendererProps {
  problem: Problem;
  answer: string | number | number[] | boolean | Record<number, number>;
  onAnswerChange: (answer: string | number | number[] | boolean | Record<number, number>) => void;
  disabled?: boolean;
}

export function QuestionRenderer({ problem, answer, onAnswerChange, disabled }: QuestionRendererProps) {
  switch (problem.type) {
    case "multiple_choice":
      return (
        <MultipleChoiceQuestion
          options={problem.options || []}
          selectedIndex={typeof answer === "number" ? answer : -1}
          onSelect={(idx) => onAnswerChange(idx)}
          disabled={disabled}
        />
      );

    case "multi_select":
      return (
        <MultiSelectQuestion
          options={problem.options || []}
          selectedIndices={Array.isArray(answer) ? (answer as number[]) : []}
          onToggle={(indices) => onAnswerChange(indices)}
          disabled={disabled}
        />
      );

    case "true_false":
      return (
        <TrueFalseQuestion
          selected={typeof answer === "boolean" ? answer : null}
          onSelect={(val) => onAnswerChange(val)}
          disabled={disabled}
        />
      );

    case "matching":
      return (
        <MatchingQuestion
          columnA={problem.columnA || []}
          columnB={problem.columnB || []}
          matches={typeof answer === "object" && !Array.isArray(answer) ? (answer as Record<number, number>) : {}}
          onMatch={(matches) => onAnswerChange(matches)}
          disabled={disabled}
        />
      );

    case "ordering":
      return (
        <OrderingQuestion
          items={problem.options || []}
          order={Array.isArray(answer) ? (answer as number[]) : problem.options?.map((_, i) => i) || []}
          onReorder={(order) => onAnswerChange(order)}
          disabled={disabled}
        />
      );

    // Default: open-ended text input (recall, numeric_fill, fill_blank, etc.)
    default:
      return (
        <Textarea
          placeholder="Type your answer here..."
          className="min-h-[150px] bg-black/20 border-white/10 focus:border-primary/50 text-lg resize-none p-4"
          value={typeof answer === "string" ? answer : ""}
          onChange={(e) => onAnswerChange(e.target.value)}
          disabled={disabled}
        />
      );
  }
}

// Multiple Choice - Radio buttons
function MultipleChoiceQuestion({
  options,
  selectedIndex,
  onSelect,
  disabled,
}: {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  disabled?: boolean;
}) {
  const labels = ["A", "B", "C", "D", "E", "F"];

  return (
    <div className="space-y-3">
      {options.map((option, idx) => (
        <button
          key={idx}
          onClick={() => !disabled && onSelect(idx)}
          disabled={disabled}
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left",
            selectedIndex === idx
              ? "border-primary bg-primary/10 text-primary"
              : "border-white/10 bg-black/20 hover:border-white/30 hover:bg-black/30",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm",
              selectedIndex === idx
                ? "bg-primary text-primary-foreground"
                : "bg-white/10 text-white/70"
            )}
          >
            {labels[idx]}
          </span>
          <span className="text-base">{option}</span>
        </button>
      ))}
    </div>
  );
}

// Multi-Select - Checkboxes
function MultiSelectQuestion({
  options,
  selectedIndices,
  onToggle,
  disabled,
}: {
  options: string[];
  selectedIndices: number[];
  onToggle: (indices: number[]) => void;
  disabled?: boolean;
}) {
  const handleToggle = (idx: number) => {
    if (disabled) return;
    if (selectedIndices.includes(idx)) {
      onToggle(selectedIndices.filter((i) => i !== idx));
    } else {
      onToggle([...selectedIndices, idx]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-2">Select all that apply:</p>
      {options.map((option, idx) => {
        const isSelected = selectedIndices.includes(idx);
        return (
          <button
            key={idx}
            onClick={() => handleToggle(idx)}
            disabled={disabled}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-white/10 bg-black/20 hover:border-white/30 hover:bg-black/30",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span
              className={cn(
                "flex-shrink-0 w-6 h-6 rounded flex items-center justify-center",
                isSelected ? "bg-primary text-primary-foreground" : "bg-white/10 border border-white/30"
              )}
            >
              {isSelected && <Check className="w-4 h-4" />}
            </span>
            <span className="text-base">{option}</span>
          </button>
        );
      })}
    </div>
  );
}

// True/False
function TrueFalseQuestion({
  selected,
  onSelect,
  disabled,
}: {
  selected: boolean | null;
  onSelect: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <Button
        variant={selected === true ? "default" : "outline"}
        size="lg"
        onClick={() => !disabled && onSelect(true)}
        disabled={disabled}
        className={cn(
          "flex-1 h-16 text-lg",
          selected === true && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
      >
        <Check className="w-5 h-5 mr-2" />
        True
      </Button>
      <Button
        variant={selected === false ? "default" : "outline"}
        size="lg"
        onClick={() => !disabled && onSelect(false)}
        disabled={disabled}
        className={cn(
          "flex-1 h-16 text-lg",
          selected === false && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
      >
        <X className="w-5 h-5 mr-2" />
        False
      </Button>
    </div>
  );
}

// Matching - Dropdowns
function MatchingQuestion({
  columnA,
  columnB,
  matches,
  onMatch,
  disabled,
}: {
  columnA: string[];
  columnB: string[];
  matches: Record<number, number>;
  onMatch: (matches: Record<number, number>) => void;
  disabled?: boolean;
}) {
  const handleMatch = (aIndex: number, bIndex: number) => {
    if (disabled) return;
    onMatch({ ...matches, [aIndex]: bIndex });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Match each item on the left with the correct item on the right:</p>
      <div className="space-y-3">
        {columnA.map((itemA, aIdx) => (
          <div key={aIdx} className="flex items-center gap-4">
            <div className="flex-1 p-3 rounded-lg bg-black/20 border border-white/10">
              <span className="font-medium">{aIdx + 1}.</span> {itemA}
            </div>
            <div className="text-muted-foreground">→</div>
            <select
              value={matches[aIdx] ?? ""}
              onChange={(e) => handleMatch(aIdx, parseInt(e.target.value))}
              disabled={disabled}
              className={cn(
                "flex-1 p-3 rounded-lg bg-black/20 border border-white/10 text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <option value="">Select...</option>
              {columnB.map((itemB, bIdx) => (
                <option key={bIdx} value={bIdx}>
                  {String.fromCharCode(65 + bIdx)}. {itemB}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// Ordering - Drag to reorder (simplified: use buttons to move up/down)
function OrderingQuestion({
  items,
  order,
  onReorder,
  disabled,
}: {
  items: string[];
  order: number[];
  onReorder: (order: number[]) => void;
  disabled?: boolean;
}) {
  const moveUp = (idx: number) => {
    if (disabled || idx === 0) return;
    const newOrder = [...order];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    onReorder(newOrder);
  };

  const moveDown = (idx: number) => {
    if (disabled || idx === order.length - 1) return;
    const newOrder = [...order];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    onReorder(newOrder);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Arrange in the correct order (use arrows to reorder):</p>
      {order.map((itemIndex, position) => (
        <div
          key={position}
          className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-white/10"
        >
          <div className="flex flex-col gap-1">
            <button
              onClick={() => moveUp(position)}
              disabled={disabled || position === 0}
              className={cn(
                "p-1 rounded hover:bg-white/10 transition-colors",
                (disabled || position === 0) && "opacity-30 cursor-not-allowed"
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => moveDown(position)}
              disabled={disabled || position === order.length - 1}
              className={cn(
                "p-1 rounded hover:bg-white/10 transition-colors",
                (disabled || position === order.length - 1) && "opacity-30 cursor-not-allowed"
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono text-sm text-muted-foreground w-6">{position + 1}.</span>
          <span className="flex-1">{items[itemIndex]}</span>
        </div>
      ))}
    </div>
  );
}

// Helper to format answer for API submission
export function formatAnswerForSubmission(
  problem: Problem,
  answer: string | number | number[] | boolean | Record<number, number>
): string {
  switch (problem.type) {
    case "multiple_choice":
      if (typeof answer === "number" && problem.options) {
        return `Selected: ${problem.options[answer]} (option ${String.fromCharCode(65 + answer)})`;
      }
      return String(answer);

    case "multi_select":
      if (Array.isArray(answer) && problem.options) {
        const selected = (answer as number[]).map((i) => problem.options![i]);
        return `Selected: ${selected.join(", ")}`;
      }
      return String(answer);

    case "true_false":
      return answer ? "True" : "False";

    case "matching":
      if (typeof answer === "object" && !Array.isArray(answer) && problem.columnA && problem.columnB) {
        const matches = Object.entries(answer as Record<number, number>)
          .map(([aIdx, bIdx]) => `${problem.columnA![parseInt(aIdx)]} → ${problem.columnB![bIdx]}`)
          .join("; ");
        return `Matches: ${matches}`;
      }
      return JSON.stringify(answer);

    case "ordering":
      if (Array.isArray(answer) && problem.options) {
        const ordered = (answer as number[]).map((i) => problem.options![i]);
        return `Order: ${ordered.join(" → ")}`;
      }
      return String(answer);

    default:
      return String(answer);
  }
}

// Check if answer is valid for submission
export function isAnswerValid(
  problem: Problem,
  answer: string | number | number[] | boolean | Record<number, number>
): boolean {
  switch (problem.type) {
    case "multiple_choice":
      return typeof answer === "number" && answer >= 0;

    case "multi_select":
      return Array.isArray(answer) && answer.length > 0;

    case "true_false":
      return typeof answer === "boolean";

    case "matching":
      if (typeof answer === "object" && !Array.isArray(answer) && problem.columnA) {
        const matches = answer as Record<number, number>;
        return Object.keys(matches).length === problem.columnA.length;
      }
      return false;

    case "ordering":
      return Array.isArray(answer) && answer.length > 0;

    default:
      return typeof answer === "string" && answer.trim().length > 0;
  }
}
