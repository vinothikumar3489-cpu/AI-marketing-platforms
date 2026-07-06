import React from "react";
import { renderSafeValue } from "../lib/normalizers";

export default function SafeRender({ value }: { value: any }) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[SafeRender] Object rendered:", Object.keys(value));
    }
  }
  return <>{renderSafeValue(value)}</>;
}

export { renderSafeValue };
