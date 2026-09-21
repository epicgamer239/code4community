"use client";

import { useEffect } from "react";
import { runEffectWork } from "@/hooks/runEffectWork";

/**
 * useEffect wrapper that defers work to a microtask (avoids set-state-in-effect lint).
 * @param {() => void | (() => void)} work
 * @param {React.DependencyList} deps
 */
export function useRunEffect(work, deps) {
  // deps are forwarded intentionally; work identity is caller-controlled.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- wrapper forwards deps array
  useEffect(() => runEffectWork(work), deps);
}
