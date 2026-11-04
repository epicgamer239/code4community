/**
 * Demo data for the School Concerns Forum: one closed cycle with responses, one open cycle,
 * and posts in every moderation state. All ids start with "seed-" so re-seeding overwrites
 * instead of duplicating, and seed posters use non-routable example.invalid emails.
 */
import { tallyBallots } from "@/lib/school-forum/ballots";
import {
  CONCERN_STATES as S,
  FORUM_COLLECTIONS as C,
  PUBLIC_STATUSES as P,
} from "@/lib/school-forum/constants";
import { isVoteEligibleConcern, rankConcerns } from "@/lib/school-forum/cycles";

const DAY = 24 * 60 * 60 * 1000;

/** [key, title, body, category, state, publicStatus, postedDaysAgo] */
const CONCERNS = [
  ["fountains", "Water fountains near the gym don't work", "Both water fountains in the hallway outside the main gym have been broken since September. After PE or practice there's nowhere close to fill a water bottle, and the line at the cafeteria filler is long.", "school", S.APPROVED, P.IN_PROGRESS, 30],
  ["wifi", "Wi-Fi dead zones in the B-wing and library back corner", "The school Wi-Fi drops completely in most B-wing classrooms and the back of the library. We can't load Schoology or submit tests on time, and teachers end up giving extensions.", "school", S.APPROVED, P.RESOLVED, 29],
  ["late-bus", "Late buses only run two days a week", "Students in clubs and tutoring on other days have no way home. More late bus days would let more people join activities, especially students whose parents work late.", "district", S.APPROVED, P.NOT_POSSIBLE, 27],
  ["stall-locks", "Bathroom stall locks are broken in the 200 hallway", "Most stall doors in the 200-hallway bathrooms don't lock. People avoid using them during the day, which is a privacy problem.", "school", S.APPROVED, P.PRESENTED, 26],
  ["passing-time", "Passing time is too short to cross the building", "Five minutes isn't enough to get from the far end of the 100 hall to the trailers, especially with crowded stairwells. Students get marked tardy even when they go straight there.", "school", S.APPROVED, P.OPEN, 25],
  ["soap", "Soap dispensers are empty in most bathrooms", "Many bathroom soap dispensers have been empty for weeks. It's hard to wash your hands before lunch.", "school", S.APPROVED, P.OPEN, 20],
  ["lunch-line", "Lunch lines take most of the lunch period", "By the time you get through the hot food line during B lunch, there are about 10 minutes left to eat. Opening the second serving line would help.", "school", S.APPROVED, P.OPEN, 18],
  ["library-outlets", "Not enough outlets in the library", "There are only a few working outlets in the library, so students with dying Chromebooks have to sit on the floor near the wall to charge.", "school", S.APPROVED, P.OPEN, 16],
  ["bus-loop", "Bus loop backs up and buses leave late every afternoon", "Car riders cut through the bus loop at dismissal and buses can't pull out for 10–15 minutes. A staff member directing traffic or a cone line could fix it.", "school", S.APPROVED, P.OPEN, 12],
  ["ap-fees", "AP exam fees are a lot for families with several exams", "Taking 4–5 AP exams costs hundreds of dollars. More information about fee reductions, or help from the district, would make it easier to take the exams.", "district", S.APPROVED, P.OPEN, 10],
  ["crosswalk", "No crosswalk signal on the road by the student parking lot", "Students walking from the overflow lot have to cross a busy road without a signal. It's dangerous in the morning when it's dark.", "outside", S.APPROVED, P.OPEN, 8],
  ["stairwell", "Main stairwell is too crowded between classes", "The main stairwell gets so packed that people get pushed. Making one stairwell up-only and another down-only could help.", "school", S.APPROVED, P.OPEN, 6],
  ["veg-options", "More vegetarian options at lunch", "Most days the only vegetarian option is a cheese sandwich. A second meatless choice would help a lot of students.", "district", S.APPROVED, P.OPEN, 4],
  // Moderation states
  ["fountain-dupe", "Gym water fountain broken", "The fountain by the gym doesn't work and it's been like that for a long time.", "school", S.MERGED, P.OPEN, 21],
  ["named-teacher", "A teacher gives too much homework", "One specific teacher assigns way more homework than other classes and won't change it.", "school", S.REJECTED, P.OPEN, 9],
  ["safety", "Someone is getting threatened in the locker room", "A student keeps getting threatened by a group in the locker room after school and is scared to tell anyone.", "school", S.SAFETY, P.OPEN, 3],
  ["parking-permits", "Parking permit lottery isn't explained", "Nobody knows how parking permits are given out or why some seniors didn't get one. Posting the rules would help.", "school", S.PENDING, P.OPEN, 1],
  ["printer", "The library printer is always out of paper", "Every time I try to print in the library before first period the printer is out of paper and nobody is there to refill it.", "school", S.PENDING, P.OPEN, 1],
  ["clocks", "Classroom clocks show the wrong time", "Clocks in a lot of rooms are a few minutes off, so people don't know when class actually ends.", "school", S.PENDING, P.OPEN, 0],
];

const RESPONSES = [
  ["fountains", P.PRESENTED, null, 15],
  ["fountains", P.IN_PROGRESS, "Facilities has ordered replacement parts for both gym hallway fountains. A bottle filler will also be added. Expected install: before winter break.", 10],
  ["wifi", P.PRESENTED, null, 15],
  ["wifi", P.RESOLVED, "LCPS technology installed two new wireless access points in the B-wing and one in the library. Please tell the SCA if you still lose connection.", 6],
  ["late-bus", P.PRESENTED, null, 15],
  ["late-bus", P.NOT_POSSIBLE, "Late bus days are set by LCPS Transportation for all schools, and there aren't enough drivers to add days this year. The SCA will raise it with the district student advisory board.", 9],
  ["stall-locks", P.PRESENTED, null, 15],
];

/** Votes per concern for each cycle (fake voters fill these in). */
const CYCLE_1_VOTES = { fountains: 48, wifi: 41, "late-bus": 33, "stall-locks": 22, "passing-time": 19, soap: 9, "library-outlets": 0 };
/** Low-vote concern SCA flagged for the cycle 1 presentation anyway. */
const CYCLE_1_FLAGGED = ["library-outlets"];
const CYCLE_2_VOTES = { "passing-time": 31, "lunch-line": 27, soap: 18, "bus-loop": 14, "library-outlets": 9, stairwell: 7, "ap-fees": 4, crosswalk: 2, "veg-options": 1 };

/** Spread vote counts across fake voters (max 3 each, one per concern), fewest-votes-first. */
function buildBallots(votePlan, voterCount) {
  const voters = Array.from({ length: voterCount }, () => []);
  const plan = Object.entries(votePlan).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of plan) {
    let placed = 0;
    const order = voters
      .map((v, i) => ({ i, n: v.length }))
      .sort((a, b) => a.n - b.n || a.i - b.i);
    for (const { i } of order) {
      if (placed >= count) break;
      if (voters[i].length < 3 && !voters[i].includes(key)) {
        voters[i].push(key);
        placed++;
      }
    }
  }
  return voters;
}

const cid = (key) => `seed-${key}`;

/**
 * @param {{ schoolId: string, now?: number }} options
 * @returns {{ collection: string, id: string, data: Record<string, unknown> }[]}
 */
export function buildForumSeed({ schoolId, now = Date.now() }) {
  const at = (daysAgo) => new Date(now - daysAgo * DAY);
  const docs = [];
  const push = (collection, id, data) => docs.push({ collection, id, data: { schoolId, ...data } });

  const cycle1 = { id: "seed-cycle-1", label: "Cycle 1", startsAt: at(29), endsAt: at(15) };
  const cycle2 = { id: "seed-cycle-2", label: "Cycle 2", startsAt: at(3), endsAt: new Date(now + 11 * DAY) };

  // Concerns, authors and private moderation data
  const concernRecords = {};
  CONCERNS.forEach(([key, title, body, category, state, publicStatus, daysAgo], index) => {
    const createdAt = at(daysAgo);
    const moderatedAt = state === S.PENDING ? null : new Date(createdAt.getTime() + 6 * 60 * 60 * 1000);
    const record = {
      title,
      body,
      category,
      state,
      publicStatus,
      createdAt,
      updatedAt: moderatedAt ?? createdAt,
      ...(moderatedAt ? { moderatedAt } : {}),
      ...(state === S.APPROVED ? { approvedAt: moderatedAt } : {}),
      ...(state === S.REJECTED ? { rejectedAt: moderatedAt } : {}),
      ...(state === S.SAFETY ? { safetyFlaggedAt: moderatedAt } : {}),
      ...(state === S.MERGED ? { mergedIntoId: cid("fountains") } : {}),
      ...(key === "fountains" ? { mergedFromIds: [cid("fountain-dupe")] } : {}),
      ...([P.PRESENTED, P.IN_PROGRESS, P.RESOLVED, P.NOT_POSSIBLE].includes(publicStatus) ? { presentedAt: at(15) } : {}),
      ...(publicStatus === P.RESOLVED ? { resolvedAt: at(6) } : {}),
    };
    concernRecords[key] = { id: cid(key), ...record };
    push(C.CONCERNS, cid(key), record);
    push(C.AUTHORS, cid(key), {
      concernId: cid(key),
      uid: `seed-student-${index + 1}`,
      email: `seed-student-${index + 1}@example.invalid`,
      createdAt,
    });
  });

  push(C.PRIVATE, cid("wifi"), {
    originalTitle: "wifi is terrible in b wing",
    originalBody: "the wifi literally never works in b wing or the back of the library. cant submit anything",
    log: [],
  });
  push(C.PRIVATE, cid("named-teacher"), {
    rejectionReason:
      "Posts can't be about a specific teacher. If the issue is homework load across classes, feel free to post about that without naming anyone.",
    log: [],
  });
  push(C.PRIVATE, cid("safety"), {
    safetyNote: "Flagged by SCA moderator during review.",
    log: [],
  });

  // Responses
  RESPONSES.forEach(([key, status, text, daysAgo], i) => {
    push(C.RESPONSES, `seed-response-${i + 1}`, {
      concernId: cid(key),
      publicStatus: status,
      text: text ?? "Presented to school administration at the SCA meeting.",
      byEmail: "seed-admin@example.invalid",
      createdAt: at(daysAgo),
    });
  });

  // Ballots + cycles
  const addCycle = (cycle, votePlan, voterCount, closed) => {
    const ballots = buildBallots(votePlan, voterCount).map((keys, i) => ({
      uid: `seed-voter-${i + 1}`,
      concernIds: keys.map(cid),
    }));
    ballots.forEach((b) =>
      push(C.BALLOTS, `${cycle.id}__${b.uid}`, {
        cycleId: cycle.id,
        uid: b.uid,
        concernIds: b.concernIds,
        updatedAt: cycle.startsAt,
      }),
    );

    const data = {
      label: cycle.label,
      startsAt: cycle.startsAt,
      endsAt: cycle.endsAt,
      flaggedConcernIds: closed ? CYCLE_1_FLAGGED.map(cid) : [],
      createdByEmail: "seed-admin@example.invalid",
      createdAt: cycle.startsAt,
      updatedAt: cycle.startsAt,
    };
    if (closed) {
      // Results as they were when the cycle closed: every concern was Open at that point.
      const eligibleAtClose = Object.keys(votePlan)
        .map((k) => ({ ...concernRecords[k], publicStatus: P.OPEN }))
        .filter((c) => c.state === S.APPROVED && isVoteEligibleConcern(c));
      data.closedAt = cycle.endsAt;
      data.ranked = rankConcerns(eligibleAtClose, tallyBallots(ballots));
      data.uniqueVoters = ballots.filter((b) => b.concernIds.length).length;
    }
    push(C.CYCLES, cycle.id, data);
  };
  addCycle(cycle1, CYCLE_1_VOTES, 70, true);
  addCycle(cycle2, CYCLE_2_VOTES, 45, false);

  return docs;
}

export const SEED_ID_PREFIX = "seed-";
