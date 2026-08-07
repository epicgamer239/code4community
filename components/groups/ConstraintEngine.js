"use client";

import { useMemo, useState } from "react";

export default function ConstraintEngine({ students, constraints, onConstraintsUpdate }) {
  const present = useMemo(() => students.filter((s) => !s.absent), [students]);
  const [blockA, setBlockA] = useState("");
  const [blockB, setBlockB] = useState("");
  const [buddyA, setBuddyA] = useState("");
  const [buddyB, setBuddyB] = useState("");

  const byId = useMemo(() => {
    const m = new Map();
    present.forEach((s) => m.set(s.id, s));
    return m;
  }, [present]);

  const addHardBlock = () => {
    if (!blockA || !blockB || blockA === blockB) return;
    const pair = [blockA, blockB].sort();
    const exists = (constraints.hardBlocks || []).some(
      ([a, b]) => a === pair[0] && b === pair[1]
    );
    if (exists) return;
    onConstraintsUpdate({
      ...constraints,
      hardBlocks: [...(constraints.hardBlocks || []), pair],
    });
    setBlockA("");
    setBlockB("");
  };

  const removeHardBlock = (index) => {
    const next = [...(constraints.hardBlocks || [])];
    next.splice(index, 1);
    onConstraintsUpdate({ ...constraints, hardBlocks: next });
  };

  const addBuddyPair = () => {
    if (!buddyA || !buddyB || buddyA === buddyB) return;
    const pair = [buddyA, buddyB].sort();
    const exists = (constraints.buddyPairs || []).some(
      ([a, b]) => a === pair[0] && b === pair[1]
    );
    if (exists) return;
    onConstraintsUpdate({
      ...constraints,
      buddyPairs: [...(constraints.buddyPairs || []), pair],
    });
    setBuddyA("");
    setBuddyB("");
  };

  const removeBuddy = (index) => {
    const next = [...(constraints.buddyPairs || [])];
    next.splice(index, 1);
    onConstraintsUpdate({ ...constraints, buddyPairs: next });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Constraints</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep students apart, pair them together, or avoid repeating prior groups.
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Must not share a group</h4>
        {(constraints.hardBlocks || []).length > 0 && (
          <ul className="space-y-1">
            {(constraints.hardBlocks || []).map(([a, b], i) => (
              <li
                key={`${a}-${b}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span>
                  {byId.get(a)?.name ?? a} / {byId.get(b)?.name ?? b}
                </span>
                <button
                  type="button"
                  onClick={() => removeHardBlock(i)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <select
            value={blockA}
            onChange={(e) => setBlockA(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/30"
          >
            <option value="">Student A</option>
            {present.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={blockB}
            onChange={(e) => setBlockB(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/30"
          >
            <option value="">Student B</option>
            {present.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addHardBlock}
            disabled={!blockA || !blockB || blockA === blockB}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <h4 className="text-sm font-medium text-foreground">Should share a group</h4>
        {(constraints.buddyPairs || []).length > 0 && (
          <ul className="space-y-1">
            {(constraints.buddyPairs || []).map(([a, b], i) => (
              <li
                key={`buddy-${a}-${b}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span>
                  {byId.get(a)?.name ?? a} / {byId.get(b)?.name ?? b}
                </span>
                <button
                  type="button"
                  onClick={() => removeBuddy(i)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <select
            value={buddyA}
            onChange={(e) => setBuddyA(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/30"
          >
            <option value="">Student A</option>
            {present.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={buddyB}
            onChange={(e) => setBuddyB(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400/30"
          >
            <option value="">Student B</option>
            {present.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addBuddyPair}
            disabled={!buddyA || !buddyB || buddyA === buddyB}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-2 border-t border-border pt-5">
        <input
          type="checkbox"
          checked={!!constraints.avoidPrevious}
          onChange={(e) =>
            onConstraintsUpdate({
              ...constraints,
              avoidPrevious: e.target.checked,
            })
          }
          className="mt-0.5 h-4 w-4 rounded border border-neutral-300"
        />
        <span className="text-sm text-muted-foreground">
          Prefer not to repeat previous group assignments when available
        </span>
      </label>

      {present.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Add students on the Roster tab to use constraints.
        </p>
      )}
    </div>
  );
}
