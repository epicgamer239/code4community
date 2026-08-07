/**
 * Assigns students to groups with basic support for constraints and strategies.
 */

function perfRank(p) {
  if (p === "high") return 2;
  if (p === "low") return 0;
  return 1;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function studentIdsInGroup(group) {
  return new Set(group.members.map((m) => m.id));
}

function violationsForGroup(group, constraints) {
  const ids = studentIdsInGroup(group);
  const out = [];

  for (const [a, b] of constraints.hardBlocks || []) {
    if (ids.has(a) && ids.has(b)) {
      out.push({ type: "hardBlock", studentIds: [a, b] });
    }
  }
  for (const [a, b] of constraints.buddyPairs || []) {
    if (ids.has(a) ^ ids.has(b)) {
      out.push({ type: "buddyPair", studentIds: [a, b] });
    }
  }
  return out;
}

function computeBalance(group) {
  const members = group.members.filter(Boolean);
  if (members.length === 0) {
    return { performance: 0, gender: 0, skills: 0, diversity: 0 };
  }
  const ranks = members.map((m) => perfRank(m.performance));
  const mean = ranks.reduce((s, r) => s + r, 0) / ranks.length;
  const variance =
    ranks.reduce((s, r) => s + (r - mean) * (r - mean), 0) / ranks.length;
  return {
    performance: Math.min(1, variance / 0.75),
    gender: 0,
    skills: 0.15,
    diversity: 0.15,
  };
}

export default class GroupingAlgorithm {
  static generate(students, constraints, config) {
    if (!Array.isArray(students)) {
      return [];
    }
    const active = students.filter((s) => !s.absent);
    const n = active.length;
    if (n === 0) return [];

    let numGroups =
      config.mode === "byNumber"
        ? Math.min(Math.max(2, config.numberOfGroups || 4), n)
        : Math.max(2, Math.ceil(n / (config.studentsPerGroup || 4)));
    numGroups = Math.min(numGroups, n);

    let ordered = [...active];
    let assignMode = "roundRobin"; // roundRobin | chunk | random

    switch (config.strategy) {
      case "random":
        ordered = shuffle(ordered);
        assignMode = "roundRobin";
        break;
      case "homogeneous":
        // Similar levels together: sort by ability, then fill groups in contiguous chunks.
        ordered.sort((a, b) => perfRank(b.performance) - perfRank(a.performance));
        assignMode = "chunk";
        break;
      case "heterogeneous":
      case "balanced":
      default:
        // Mixed / balanced: sort by ability, then deal round-robin so each group gets a mix.
        ordered.sort((a, b) => perfRank(b.performance) - perfRank(a.performance));
        assignMode = "roundRobin";
        break;
    }

    const groups = Array.from({ length: numGroups }, (_, i) => ({
      id: `group-${Date.now()}-${i}`,
      name: `Group ${i + 1}`,
      members: [],
      size: 0,
      constraints: [],
      balance: {},
    }));

    if (assignMode === "chunk") {
      const base = Math.floor(n / numGroups);
      const extra = n % numGroups;
      let cursor = 0;
      for (let g = 0; g < numGroups; g++) {
        const take = base + (g < extra ? 1 : 0);
        groups[g].members = ordered.slice(cursor, cursor + take);
        cursor += take;
      }
    } else {
      ordered.forEach((student, idx) => {
        groups[idx % numGroups].members.push(student);
      });
    }

    groups.forEach((g) => {
      g.size = g.members.length;
    });

    groups.forEach((g) => {
      g.constraints = violationsForGroup(g, constraints);
      g.balance = computeBalance(g);
    });

    return groups;
  }
}
