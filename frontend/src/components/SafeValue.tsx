import React from "react";

type SafeValueProps = {
  value: any;
  className?: string;
};

const isPrimitive = (value: any) =>
  value === null ||
  value === undefined ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

export const safeText = (value: any): string => {
  if (value === null || value === undefined) return "Not available";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (import.meta.env.DEV && typeof value === "object" && value !== null) {
    console.warn("[SAFE VALUE OBJECT]", value);
  }

  if (Array.isArray(value)) {
    return value.map(safeText).join(", ");
  }

  if (typeof value === "object") {
    if ("score" in value || "reason" in value || "source" in value || "category" in value || "priority" in value) {
      return [
        value.score !== undefined ? `Score: ${safeText(value.score)}` : null,
        value.reason !== undefined ? `Reason: ${safeText(value.reason)}` : null,
        value.source !== undefined ? `Source: ${safeText(value.source)}` : null,
        value.category !== undefined ? `Category: ${safeText(value.category)}` : null,
        value.priority !== undefined ? `Priority: ${safeText(value.priority)}` : null,
      ].filter(Boolean).join(" | ");
    }

    if ("value" in value || "impact" in value || "confidence" in value) {
      return [
        value.value !== undefined ? `Value: ${safeText(value.value)}` : null,
        value.impact !== undefined ? `Impact: ${safeText(value.impact)}` : null,
        value.confidence !== undefined ? `Confidence: ${safeText(value.confidence)}` : null,
      ].filter(Boolean).join(" | ");
    }

    return Object.entries(value)
      .map(([key, val]) => `${key}: ${safeText(val)}`)
      .join(" | ");
  }

  return String(value);
};

export default function SafeValue({ value, className }: SafeValueProps) {
  if (isPrimitive(value)) {
    return <span className={className}>{safeText(value)}</span>;
  }

  if (Array.isArray(value)) {
    return (
      <div className={className}>
        {value.map((item, index) => (
          <div key={index}>
            <SafeValue value={item} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    return (
      <div className={className}>
        {Object.entries(value).map(([key, val]) => (
          <div key={key}>
            <strong>{key}:</strong> <SafeValue value={val} />
          </div>
        ))}
      </div>
    );
  }

  return <span className={className}>{safeText(value)}</span>;
}
