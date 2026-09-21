/**
 * Broad Run High School club directory — club name + sponsor contact(s).
 * Source: school club list (student-facing).
 */

/** @typedef {{ name: string, email: string }} BroadRunSponsor */
/** @typedef {{ name: string, sponsors: BroadRunSponsor[] }} BroadRunClub */

/** @type {BroadRunClub[]} */
export const BROAD_RUN_CLUBS = [
  {
    name: "Advanced Leadership Program (ALP)",
    sponsors: [{ name: "Timothy Cathcart", email: "Timothy.Cathcart@lcps.org" }],
  },
  { name: "AI", sponsors: [{ name: "Nigah Igbal", email: "Nigah.Igbal@lcps.org" }] },
  {
    name: "All Real Music",
    sponsors: [{ name: "Hannah Reynolds", email: "Hannah.Reynolds@lcps.org" }],
  },
  {
    name: "American Cancer Society",
    sponsors: [{ name: "Emily Flynn", email: "Emily.flynn@lcps.org" }],
  },
  {
    name: "Anime Club",
    sponsors: [{ name: "Dallas Peck", email: "Dallas.peck@lcps.org" }],
  },
  {
    name: "Asian Student Association (ASA)",
    sponsors: [
      { name: "Stephanie Kimble", email: "Stephanie.Kimble@lcps.org" },
      { name: "Theresa Rossell", email: "Theresa.Rossell@lcps.org" },
    ],
  },
  {
    name: "Baking Club",
    sponsors: [{ name: "Betsy Neathawk", email: "Betsy.Neathawk@lcps.org" }],
  },
  {
    name: "Best Buddies",
    sponsors: [
      { name: "Jennifer Birchmeier", email: "Jennifer.Birchmeier@lcps.org" },
      { name: "Jen Angulo", email: "Jennifer.Angulo@lcps.org" },
    ],
  },
  {
    name: "Black Student Union (BSU)",
    sponsors: [
      { name: "Leona Days-King", email: "Leona.Daysking@lcps.org" },
      { name: "Katrice White", email: "Katrice.White@lcps.org" },
      { name: "Darrell Lawrence", email: "Darrell.Lawrence@lcps.org" },
      { name: "Amaris Topper", email: "Amaris.Topper@lcps.org" },
    ],
  },
  {
    name: "Book Club",
    sponsors: [{ name: "Alicia Heflin", email: "Alicia.Heflin@lcps.org" }],
  },
  {
    name: "Chess Club",
    sponsors: [{ name: "Freshta Nafey", email: "Freshta.Nafey@lcps.org" }],
  },
  {
    name: "Chick-fil-A Leader Academy",
    sponsors: [{ name: "Casey Sorenson", email: "Casey.Sorenson@lcps.org" }],
  },
  {
    name: "Class of 2027",
    sponsors: [
      { name: "Emily Flynn", email: "Emily.Flynn@lcps.org" },
      { name: "Margot Storch", email: "Margot.Storch@lcps.org" },
    ],
  },
  {
    name: "Class of 2028",
    sponsors: [
      { name: "Debbie Harris", email: "Deborah.Harris@lcps.org" },
      { name: "Christina Casares", email: "Christina.Casares@lcps.org" },
    ],
  },
  {
    name: "Class of 2029",
    sponsors: [
      { name: "Nicole Galioto", email: "Nicole.Galioto@lcps.org" },
      { name: "Ruth Swartzbaugh", email: "Ruth.Swartzbaugh@lcps.org" },
    ],
  },
  {
    name: "Class of 2030",
    sponsors: [
      { name: "Heather Burton", email: "Heather.Burton@lcps.org" },
      { name: "Betsy Neathawk", email: "Betsy.Neathawk@lcps.org" },
    ],
  },
  {
    name: "Code4Community",
    sponsors: [{ name: "Iva Brkic", email: "Iva.Brkic@lcps.org" }],
  },
  {
    name: "Competitive Math Union",
    sponsors: [{ name: "Hannah Reynolds", email: "Hannah.Reynolds@lcps.org" }],
  },
  {
    name: "Computer Science Honor Society",
    sponsors: [
      { name: "Tony Rochon", email: "Anthony.rochon@lcps.org" },
      { name: "Tim Cathcart", email: "Timothy.Cathcart@lcps.org" },
    ],
  },
  {
    name: "CREW",
    sponsors: [{ name: "Jackie Smith", email: "Jackiejollysmith@gmail.com" }],
  },
  {
    name: "Debate & Speech Team",
    sponsors: [
      { name: "Daud Yamin", email: "Daud.yamin@gmail.com" },
      { name: "Kiran Madavarapu", email: "Mkiran03@gmail.com" },
    ],
  },
  {
    name: "DECA",
    sponsors: [
      { name: "Casey Sorenson", email: "Casey.Sorenson@lcps.org" },
      { name: "Amy Fulwiler", email: "Amy.Fulwiler@lcps.org" },
      { name: "Anne Hulse", email: "Anne.Hulse@lcps.org" },
      { name: "Michael Poerksen", email: "Michael.Poerksen@lcps.org" },
    ],
  },
  {
    name: "Dungeons and Dragons (Dnd)",
    sponsors: [{ name: "Freshta Nafey", email: "Freshta.Nafey@lcps.org" }],
  },
  {
    name: "Educators Rising",
    sponsors: [{ name: "Amy Fulwiler", email: "Amy.Fulwiler@lcps.org" }],
  },
  {
    name: "Future Business Leaders of America (FBLA)",
    sponsors: [
      { name: "Chris Truong", email: "Christopher.Truong@lcps.org" },
      { name: "Travis Smith", email: "Travis.Smith@lcps.org" },
      { name: "Tricia Brown", email: "Patricia.Brown@lcps.org" },
    ],
  },
  {
    name: "Family, Career and Community Leaders of America (FCCLA)",
    sponsors: [
      { name: "Laura Martinez", email: "Laura.martinez@lcps.org" },
      { name: "Cassie Essex", email: "Cassie.Essex@lcps.org" },
    ],
  },
  {
    name: "Fishing Club",
    sponsors: [{ name: "Veera Walker", email: "Veera.walker@lcps.org" }],
  },
  {
    name: "French Club",
    sponsors: [{ name: "Betsy Neathawk", email: "Betsy.Neathawk@lcps.org" }],
  },
  {
    name: "Gender-Sexuality Alliance",
    sponsors: [{ name: "Alicia Heflin", email: "Alicia.Heflin@lcps.org" }],
  },
  {
    name: "German Club",
    sponsors: [{ name: "Anne Friedrich", email: "Anne.Friedrich@lcps.org" }],
  },
  {
    name: "Girls Who Code",
    sponsors: [{ name: "Tony Rochon", email: "Anthony.rochon@lcps.org" }],
  },
  {
    name: "Hacky Sack Club",
    sponsors: [{ name: "Ashley Strausser", email: "Ashley.Strausser@lcps.org" }],
  },
  {
    name: "Hiking Club",
    sponsors: [{ name: "Emily Flynn", email: "Emily.flynn@lcps.org" }],
  },
  {
    name: "Hispanic Student Union",
    sponsors: [
      { name: "Laura Garcia Hacek", email: "Laura.Garciahacek@lcps.org" },
      { name: "Harold Romero", email: "Harold.romero@lcps.org" },
      { name: "Manny Mercado Hernandez", email: "Junior.MercadoHernandez@lcps.org" },
    ],
  },
  {
    name: "Interact",
    sponsors: [
      { name: "Tom Newman", email: "Thomas.newman@lcps.org" },
      { name: "Brenda Armani", email: "Brenda.Armani@lcps.org" },
    ],
  },
  {
    name: "International Thespian Society",
    sponsors: [{ name: "Alexis Cohen", email: "Alexis.Cohen@lcps.org" }],
  },
  {
    name: "Jewish Student Union (JSU)",
    sponsors: [
      { name: "Hayley Christiansen", email: "Hayley.Christiansen@lcps.org" },
      { name: "Debbie Berman", email: "Debbie.Berman@lcps.org" },
    ],
  },
  {
    name: "Key Club",
    sponsors: [
      { name: "Tracy Price", email: "Tracy.Price@lcps.org" },
      { name: "Elizabeth Hafer", email: "Elizabeth.Hafer@lcps.org" },
    ],
  },
  {
    name: "Medlife",
    sponsors: [{ name: "Hannah Dise", email: "Hannah.Dise@lcps.org" }],
  },
  {
    name: "Mock Trial",
    sponsors: [{ name: "Tom Newman", email: "Thomas.Newman@lcps.org" }],
  },
  {
    name: "Muslim Student Association (MSA)",
    sponsors: [
      { name: "Hannah Dise", email: "Hannah.Dise@lcps.org" },
      { name: "Freshta Nafey", email: "Freshta.Nafey@lcps.org" },
    ],
  },
  {
    name: "National Art Honor Society (NAHS)",
    sponsors: [
      { name: "Margot Storch", email: "Margot.Storch@lcps.org" },
      { name: "Abigail Wiggins", email: "Abigail.Wiggins@lcps.org" },
    ],
  },
  {
    name: "National English Honor Society — Psi Epsilon Nu (PEN)",
    sponsors: [
      { name: "Aubrey Skavdahl", email: "Aubrey.Skavdahl@lcps.org" },
      { name: "Beth Lopez", email: "Beth.Lopez@lcps.org" },
    ],
  },
  {
    name: "National Honor Society (NHS)",
    sponsors: [
      { name: "Tricia Brown", email: "Patricia.brown@lcps.org" },
      { name: "Hannah Dise", email: "Hannah.dise@lcps.org" },
    ],
  },
  {
    name: "National Math Honor Society — Mu Alpha Theta (MAT)",
    sponsors: [
      { name: "Deborah Harris", email: "Deborah.Harris@lcps.org" },
      { name: "Christina Casares", email: "Christina.Casares@lcps.org" },
    ],
  },
  {
    name: "National Social Studies Honor Society — Rho Kappa",
    sponsors: [
      { name: "Robyn Griffis", email: "Robyn.Griffis@lcps.org" },
      { name: "Phil Cox", email: "Philip.Cox@lcps.org" },
    ],
  },
  {
    name: "PEER",
    sponsors: [
      { name: "Christy Wiggins", email: "Christine.Wiggins@lcps.org" },
      { name: "Joaquin Perez-Arrieta", email: "Joaquin.PerezArrieta@lcps.org" },
    ],
  },
  {
    name: "Philippine United Student Union (PUSO)",
    sponsors: [{ name: "Theresa Rossell", email: "Theresa.Rossell@lcps.org" }],
  },
  {
    name: "Psychology Club",
    sponsors: [{ name: "Robyn Griffis", email: "Robyn.Griffis@lcps.org" }],
  },
  {
    name: "Real Estate Club",
    sponsors: [{ name: "Ruth Swartzbaugh", email: "Ruth.Swartzbaugh@lcps.org" }],
  },
  {
    name: "Red Cross",
    sponsors: [{ name: "Freshta Nafey", email: "Freshta.Nafey@lcps.org" }],
  },
  {
    name: "Robotics",
    sponsors: [{ name: "Tim Cathcart", email: "Timothy.Cathcart@lcps.org" }],
  },
  {
    name: "Science National Honor Society (SNHS)",
    sponsors: [{ name: "Jennifer Dunn", email: "Jennifer.e.dunn@lcps.org" }],
  },
  {
    name: "Science Olympiad",
    sponsors: [{ name: "Mark Harty", email: "Mark.harty@lcps.org" }],
  },
  {
    name: "Show Choir (Spartan Songbirds)",
    sponsors: [{ name: "Larry Ratliff", email: "Larry.RatliffIII@lcps.org" }],
  },
  {
    name: "Skaters Student Union",
    sponsors: [],
  },
  {
    name: "Smartans",
    sponsors: [
      { name: "Stephanie Kimble", email: "Stephanie.Kimble@lcps.org" },
      { name: "Anthony Rochon", email: "Anthony.Rochon@lcps.org" },
    ],
  },
  {
    name: "Spartans, Ink / Literary Magazine: Unbound / Creative Writing",
    sponsors: [{ name: "Michele Evans", email: "Michele.Evans@lcps.org" }],
  },
  {
    name: "Spirit of Spartans (SOS) / Unified Sports",
    sponsors: [{ name: "Sadia Kullane", email: "Sadia.kullane@lcps.org" }],
  },
  {
    name: "Sports Talk",
    sponsors: [{ name: "Michael Poerksen", email: "Michael.poerksen@lcps.org" }],
  },
  {
    name: "Step Team",
    sponsors: [{ name: "Leona Days-King", email: "Leona.Daysking@lcps.org" }],
  },
  {
    name: "Stock Market Club",
    sponsors: [{ name: "Phil Cox", email: "Phillip.Cox@lcps.org" }],
  },
  {
    name: "Student Council Association (SCA)",
    sponsors: [
      { name: "Lauren Bryan", email: "Lauren.bryan@lcps.org" },
      { name: "Hayley Christiansen", email: "Hayley.christiansen@lcps.org" },
    ],
  },
  {
    name: "Student Equity Committee",
    sponsors: [{ name: "Catherine Kenda", email: "Catherine.Kenda@lcps.org" }],
  },
  {
    name: "Technology Student Association (TSA)",
    sponsors: [{ name: "Phil Truiett", email: "Phillip.truiett@lcps.org" }],
  },
  {
    name: "Teens for Christ (TFC)",
    sponsors: [{ name: "Jake Krogh", email: "Jacob.Krogh@lcps.org" }],
  },
  {
    name: "Tennis Club",
    sponsors: [
      { name: "Alicia Heflin", email: "Alicia.Heflin@lcps.org" },
      { name: "Chad Rufola", email: "Chad.Runfola@lcps.org" },
    ],
  },
  {
    name: "Thrift Club",
    sponsors: [{ name: "Hannah Dise", email: "Hannah.Dise@lcps.org" }],
  },
  {
    name: "Top Gear Spartans",
    sponsors: [{ name: "Neil Dennis", email: "Neil.Dennis@lcps.org" }],
  },
  {
    name: "Tri-M Music Honor Society",
    sponsors: [{ name: "Carrie Albers", email: "Carrie.Albers@lcps.org" }],
  },
  {
    name: "UNICEF",
    sponsors: [{ name: "Karrie Rinder", email: "Karrie.Rinder@lcps.org" }],
  },
  {
    name: "We're All Human",
    sponsors: [
      { name: "Jennifer Kroll", email: "Jennifer.Zuckerman@lcps.org" },
      { name: "Susan Ellis", email: "Susan.ellis@lcps.org" },
      { name: "Chris Zyck", email: "Christopher.Zyck@lcps.org" },
    ],
  },
  {
    name: "Winter Guard",
    sponsors: [{ name: "Eric Blanks", email: "eric.blanks@lcps.org" }],
  },
  {
    name: "Yarn Arts Club",
    sponsors: [{ name: "Jennifer Reynolds", email: "Jennifer.Reynolds@lcps.org" }],
  },
];

/** URL slug for a club name (stable, lowercase, hyphenated). */
export function clubNameToSlug(name) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** @param {string} slug */
export function getClubBySlug(slug) {
  return BROAD_RUN_CLUBS.find((club) => clubNameToSlug(club.name) === slug) ?? null;
}

export function getAllClubSlugs() {
  return BROAD_RUN_CLUBS.map((club) => clubNameToSlug(club.name));
}

/** Sorted club options for admin/sponsor dashboards and autocomplete. */
export function getSortedClubOptions() {
  return BROAD_RUN_CLUBS.map((club) => ({
    slug: clubNameToSlug(club.name),
    name: club.name,
  })).sort((a, b) => a.name.localeCompare(b.name));
}
