/**
 * Academies of Loudoun static club directory.
 * Source: https://www.lcps.org/o/acl/page/acl-clubs
 */

import { getCustomClubs } from "@/lib/club-hub/customClubStore";
import { getRemovedClubSlugs } from "@/lib/club-hub/removedClubsStore";

/** @typedef {{ name: string, email: string }} AclSponsor */
/** @typedef {{ name: string, description?: string, sponsors: AclSponsor[] }} AclClub */

/** @type {AclClub[]} */
export const ACL_CLUBS = [
  {
    name: "AI Club",
    description: "We will teach students about various forms and effects of AI, and conduct hands-on activities to get a better understanding of the topic.",
    sponsors: [{ name: "Livia Wolfer", email: "Livia.Wolfer@lcps.org" }],
  },
  {
    name: "Art & Heart Club",
    description: "To host fun and engaging art activities that incorporate art exploration in meaningful ways.",
    sponsors: [{ name: "Tobie Juleau", email: "Tobie.Juleau@lcps.org" }],
  },
  {
    name: "Basketball & Sports Club",
    sponsors: [{ name: "Sharon Oliver", email: "Sharon.Oliver@lcps.org" }],
  },
  {
    name: "Between the Lines",
    description: "The mission of Between the Lines is to foster meaningful connections between generations by sending letters back and forth to share stories, experiences, and advice. We believe these relationships allow students to get valuable mentorship while giving seniors a way to build friendships and make a community impact.",
    sponsors: [{ name: "Meghan Reichard", email: "Meghan.Reichard@lcps.org" }],
  },
  {
    name: "Black Student Alliance",
    sponsors: [{ name: "Cos Fi", email: "Cos.Fi@lcps.org" }],
  },
  {
    name: "Cancer Kids First",
    sponsors: [{ name: "Melissa Ewing", email: "Melissa.Ewing@lcps.org" }],
  },
  {
    name: "Care4Cancer",
    description: `Care4cancer is a club for students who are interested in helping those affected by cancer. We do volunteer work, collect items, and donate to well-known cancer charities.

Remind: @care4can

Instagram: @care4canceracl`,
    sponsors: [{ name: "Maria Bettilyon", email: "Maria.Bettilyon@lcps.org" }],
  },
  {
    name: "Chess Club",
    description: "Come join the Chess Club to hang out and play chess, solve puzzles, play in tournaments, and more!",
    sponsors: [{ name: "Tobie Juleau", email: "Tobie.Juleau@lcps.org" }],
  },
  {
    name: "Christian Student Association",
    description: "A student-led club dedicated to helping students grow closer to God, deepen their understanding of the Bible and build fellowship with other Christians. Through group prayer, Bible study, and acts of service, CSA will offer a welcoming space for all students to explore and strengthen their faith together.",
    sponsors: [{ name: "Alan Lear", email: "Alan.Lear@lcps.org" }],
  },
  {
    name: "Competitive Programming Club",
    description: `The Competitive Programming Club helps students sharpen their problem-solving and algorithmic skills. At our meetings, we teach core competitive programming topics and prepare members for contests through practice problems and in-house competitions. We select teams to represent ACL at events like the HSPCs at UVA, VT, VCU, and UMD, Lockheed Martin CodeQuest, and MIT-IT. These contests are a great way to win prizes, boost your college applications, and develop crucial programming skills.

Details

Some prior experience with a programming language is recommended, but not required.

Team selection considers meeting attendance, programming fluency, and in-house contest rankings.

For more information, view our information document.

Interested? Sign up here.`,
    sponsors: [{ name: "Dr. Patrick White", email: "Patrick.White@lcps.org" }],
  },
  {
    name: "Computational Autonomous Systems Laboratory (CASL)",
    description: "The Computational Autonomous Systems Laboratory (CASL) focuses on the development and refinement of neural and non-neural algorithms such as Kalman filters or Hopfield networks. We intend to draw on ML, computational mathematics, and robotics to produce stimulus-responsive autonomous architectures. Multiple research tracks will operate under CASL, each consisting of collaboratively exploring projects' technical domains, development of computational simulation environments and physical systems (with sponsor approval), and manuscript submissions to journals. CASL is student-run with adult oversight, requires no prior experience, and includes leadership positions for each track.",
    sponsors: [
      { name: "Zachary Minchow-Proffitt", email: "Zachary.Minchow-Proffitt@lcps.org" },
    ],
  },
  {
    name: "Computer Science Honor Society",
    description: `The CSHS club is committed to honoring excellence in and spreading our passion for computer science.  We offer tutoring services and organize various events like the Hour of Code for the Level Up and Propel elementary and middle school students in December and the Academies hackathon (website) in the spring. CSHS aims to make computer science more accessible to others through outreach programs.

Requirements

Must have completed at least one year of computer science with a B average or better

Must complete at least 10 hours of volunteer service by the end of the year

We ask for $10 dues for those that can afford it to pay for the graduation cord and support our outreach efforts`,
    sponsors: [
      { name: "Tobie Juleau", email: "Tobie.Juleau@lcps.org" },
      { name: "Erin Wissler", email: "Erin.Wissler@lcps.org" },
    ],
  },
  {
    name: "Creative Writing Club",
    description: "To inspire new ideas and share the joy of writing with all.",
    sponsors: [{ name: "Cos Fi", email: "Cos.Fi@lcps.org" }],
  },
  {
    name: "Cyber Competition Club",
    sponsors: [{ name: "Jeremy Staples", email: "Jeremy.Staples@lcps.org" }],
  },
  {
    name: "DECA",
    sponsors: [{ name: "Sandra Tucker", email: "Sandra.Tucker@lcps.org" }],
  },
  {
    name: "Drives for Lives",
    sponsors: [{ name: "Sharon Dennington", email: "Sharon.Dennington@lcps.org" }],
  },
  {
    name: "FFA",
    sponsors: [
      { name: "Amanda Fallon", email: "Amanda.Fallon@lcps.org" },
      { name: "Deborah Chaves", email: "Deborah.Chaves@lcps.org" },
    ],
  },
  {
    name: "Film Club",
    description: `The Academies Film Club is for ACL students who are interested in submitting a film to the annual VHSL Film Festival, and need a sponsor to help work on their films, as well as find opportunities to work with other peers on their films.

The ACL Film Club Sponsor and VHSL Committee Member is: Tara Wall

View our student showcase of featured films.`,
    sponsors: [{ name: "Tara Wall", email: "Tara.Wall@lcps.org" }],
  },
  {
    name: "Girls Who Code",
    description: `Girls Who Code is a national non-profit organization working to close the gender gap in technology.  Our programs educate, equip, and inspire girls with the computing skills they'll need to pursue 21st century opportunities.

Girls Who Code is on a mission to close the gender gap in technology and to change the image of what a programmer looks like and does.

GWC Overview Presentation

Join us!

Schoology for updates and information:R5WQ-9S3S-FVMHQ

Remind: @aclgwc`,
    sponsors: [
      { name: "Tobie Juleau", email: "Tobie.Juleau@lcps.org" },
      { name: "Erin Wissler", email: "Erin.Wissler@lcps.org" },
    ],
  },
  {
    name: "Green Earth Club",
    description: `Academies of Loudoun Green Earth Club

Join Us!

Are you passionate about the environment? Join the Academies of Loudoun Green Earth Club! We actively compete in Envirothon and will establish teams early in the year.

Stay Connected:

Follow us on Instagram (@aclgreenearthclub) and Schoology (GW3S-HK2Z-4KJK3)

Learn More:

Visit the Envirothon website for more information on our national competition: https://envirothon.org/`,
    sponsors: [{ name: "Lori Stone", email: "Lori.Stone@lcps.org" }],
  },
  {
    name: "Hackademies",
    description: "Hackademies coaches students on how to effectively build projects in a short period of time and win prestigious hackathon awards. We are a community where students engage in collaborative problem solving, creativity, and programming, all critical skills for careers in software development. Club activities include (1) providing strategies on how to win hackathons, (2) team-formation for each event, (3) setting up one's device for hackathons, and (4) conducting practice hackathons.",
    sponsors: [{ name: "Gerald Shapiro", email: "Gerald.Shapiro@lcps.org" }],
  },
  {
    name: "HOSA",
    description: `The mission of HOSA is to empower HOSA-Future Health Professionals to become leaders in the global health community through education, collaboration, and experience.

The purpose of HOSA-Future Health Professionals is to develop leadership and technical HOSA skill competencies through a program of motivation, awareness and recognition, which is an integral part of the Health Science Education instructional program.

Meetings take place on an as needed basis throughout the school year

Students enrolled in the Health and Medical Science Programs are eligible for membership.`,
    sponsors: [
      { name: "Betsy Palewicz", email: "Betsy.Palewicz@lcps.org" },
      { name: "Nyla Dockery", email: "Nyla.Dockery@lcps.org" },
    ],
  },
  {
    name: "Interact Club",
    description: "A student-led service organization sponsored by the Rotary Club of Broadlands and affiliated with Rotary International. The club provides students with opportunities to develop leadership skills, participate in meaningful community service, and build connections with local and global leaders. Through volunteer projects, fundraising initiatives, and collaborative activities, members work together to make a positive impact in their school and community while fostering teamwork, civic responsibility, and personal growth.",
    sponsors: [{ name: "Dana Kincaid", email: "Dana.Kincaid@lcps.org" }],
  },
  {
    name: "Mahjong Society",
    description: "A club dedicated to learning and playing different versions of mahjong.  All can master table and tile alike.",
    sponsors: [{ name: "Livia Wolfer", email: "Livia.Wolfer@lcps.org" }],
  },
  {
    name: "Math Team",
    sponsors: [{ name: "Jiranan Poonate", email: "Jiranan.Poonate@lcps.org" }],
  },
  {
    name: "Music Club",
    sponsors: [
      { name: "Megan Fay", email: "Megan.Fay@lcps.org" },
      { name: "Alan Lear", email: "Alan.Lear@lcps.org" },
    ],
  },
  {
    name: "Muslim Student Association",
    description: `The Muslim Student Association (MSA) at the Academies of Loudoun provides a platform for Muslim students to enhance their personal, spiritual and moral development through weekly Jum’ah (Friday) prayers, periodic educational and cultural programs, Ramadan activities, and celebration of Muslim festivals.

The MSA is dedicated to fostering an inclusive and supportive environment where students of all backgrounds can learn about and appreciate Muslim culture, history, science, and traditions. We strive to promote understanding, respect, and community through educational and cultural programs, and service initiatives.

Programs

The MSA shall host Jum’ah prayers every Friday (A & B Days) during the lunch hour from 1:05-1:30pm. Students wishing to participate should bring their lunch with them, which they can consume right after prayers.

Other programs and activities will be posted on the bulletin boards or through morning announcements. These may include the following:

Iftar gatherings during Ramadan (after school)

Eid-ul-Fitr and Eid-ul-Adha get-togethers or other celebrations

Lectures or seminars on Muslim history, Muslim contribution to Science and Technology, Qur’an, Hadith, and other topics of interest`,
    sponsors: [
      { name: "Hasina Hafner", email: "Hasini.Hafner@lcps.org" },
      { name: "Kazi Siddiqui", email: "Kazi.Siddiqui@lcps.org" },
    ],
  },
  {
    name: "National Society of Black Engineers",
    description: `“to increase the number of culturally responsible black engineers who excel academically, succeed professionally and positively impact the community."

MEMBERSHIP: Membership is open to all Academies of Loudoun students regardless of pathway, race, religion, or gender.`,
    sponsors: [{ name: "Octavia Williams", email: "Octavia.Williams@lcps.org" }],
  },
  {
    name: "National Technical Honor Society (NTHS)",
    description: `Applications & Nomination Forms

NTHS Application

NTHS Teacher/Counselor Nomination

National Technical Honor Society (NTHS) is the honor society for Career & Technical Education (CTE). As a national non-profit student organization, NTHS has been recognizing outstanding student achievement in CTE since 1984. Having served over 1.2 million members in secondary and postsecondary chapters across the country and beyond, NTHS continues to support the next generation of skilled workers and leaders through chapter activities built around our Core Four Objectives of career development, leadership development, service, and recognition.

NTHS Mission Statement

The mission of the National Technical Honor Society is to advocate for and empower all students to pursue the skills needed to build their careers and the global workforce.

NTHS Vision Statement

The Vision of the National Technical Honor Society is to be the international leader in providing recognition for excellence in career and technical education.

The NTHS Core 4 Objectives

The NTHS Core 4 Objectives serve as guiding principles that direct the activities and growth of local chapters. Derived from the original seven attributes of NTHS “Skill, Scholarship, Leadership, Honesty, Responsibility, Service, and Citizenship” these objectives are designed to empower members and foster their development in areas essential for success in their future careers. They include Career Development, Leadership, Service, and Recognition opportunities. These objectives provide a foundation for building a vibrant and impactful NTHS community, fostering growth, leadership, service, and recognition among its members.

Criteria

● Overall weighted GPA of 3.0 or higher.

● Must be a rising junior or a rising senior.

● Be actively enrolled in a Career and Technical Education (CTE) elective course or pathway at ACL.

● Achieve a semester average of an A (93-100) in your technical program (93-100 for MATA).

● For AET: Semester averages across three academies courses must equate to an A (93-100).

● Demonstrate good attendance, with no more than 5 absences (please inform us of any extenuating circumstances).

● Have no honor code violations.

● Active CTSO ( Career and Technical Student Organizations) involvement.

● Submit a completed application and essay, which will be reviewed by the selection team. The essay prompt is in the application and needs to be completed. ● Provide one teacher nomination form by sharing this link: National Technical Honor Society Teacher Nomination Form with your teacher for completion.

● Pay a one-time $33 application fee (due only upon acceptance).

● Application deadline: Monday, March 23, 202`,
    sponsors: [{ name: "Kathleen Healey", email: "Kathleen.Healey@lcps.org" }],
  },
  {
    name: "Newscast Club",
    description: "To announce relevant news for the students, by the students",
    sponsors: [
      { name: "Rebecca Stone", email: "Rebecca.Stone@lcps.org" },
      { name: "Amy Santos", email: "Amy.Santos@lcps.org" },
    ],
  },
  {
    name: "Philosophy Club",
    description: "Philosophy Club meets every Thursday on B-days. We will learn about important philosophical concepts and philosophers through interesting discussions! We will discuss and look for answers to interesting philosophical questions (e.g. what is the meaning of life? what is good and evil?). There is no right answer in philosophy, so everyone will be able to formulate their own view of the world. It is a place to have fun learning and talking philosophy!",
    sponsors: [
      { name: "Gina Craun", email: "Gina.Craun@lcps.org" },
      { name: "Cos Fi", email: "Cos.Fi@lcps.org" },
    ],
  },
  {
    name: "Physics & Astronomy Club",
    sponsors: [{ name: "Dan Crowe", email: "Dan.Crowe@lcps.org" }],
  },
  {
    name: "Princess Packages",
    description: "Princess Packages is a non-profit charity federally that creates care packages to give to young children during their hospital stays. Meetings are scheduled ahead of time. Make sure to join our Schoology group to get the dates and times!",
    sponsors: [{ name: "Michael Croly", email: "Michael.Croly@lcps.org" }],
  },
  {
    name: "Project Lit",
    sponsors: [
      { name: "Jennifer Hiltner", email: "Jennifer.Hiltner@lcps.org" },
      { name: "Amy Santos", email: "Amy.Santos@lcps.org" },
    ],
  },
  {
    name: "Red Cross Club",
    description: "The mission of Red Cross Club is to support the American Red Cross in its efforts to protect life and health and to ensure respect for the human being. Our club will educate students about disaster relief, blood donation, and other ways to help out the community while provided students and club members the opportunity to volunteer and serve in our community.",
    sponsors: [{ name: "Karen Swanchara", email: "Karen.Swanchara@lcps.org" }],
  },
  {
    name: "RoboLoco",
    description: `Academies of Loudoun RoboLoCo is a FIRST Robotics Competition (FRC) team that represents our school, the Academies of Loudoun. Our team name stands for Robotics - Loudoun County because we were the first FRC team in Loudoun County. We work year-round to grow our expertise in everything from programming to CAD to machine fabrication. Our team also engages in many outreach programs, such as showcasing our robot at various community STEAM nights, advocating for STEM education at the National Advocacy Conference, promoting STEM with our podcast, Robocast, and supporting other FRC teams in the Chesapeake District!

FIRST, which stands for “For Inspiration and Recognition of Science and Technology”, is an international organization that serves to provide opportunities for students of all ages to pursue STEM and robotics. RoboLoCo is part of their FRC program, where FIRST challenges them to build a robot in six weeks that is suited to a game that they release every January. After those six weeks, teams compete at their local competitions to qualify for their state/district competitions and to win nontechnical and technical awards. Along with STEM, FIRST encourages its members to immerse themselves in their communities by sharing STEM with others and collaborating with businesses for sponsorships. In FRC, students strive not only to create a strong and competitive robot but also to earn prestigious awards that guarantee a spot to compete at the FIRST World Championships. Two of these awards are the Chairman’s Award and the Engineering Inspiration Award, which recognize teams’ efforts and passion for spreading STEM in and beyond their community.

Learn more about RoboLoco`,
    sponsors: [
      { name: "Josh Ajima", email: "Josh.Ajima@lcps.org" },
      { name: "Rebecca Stone", email: "Rebecca.Stone@lcps.org" },
      { name: "Leah Steinbronn", email: "Leah.Steinbronn@lcps.org" },
      { name: "Michael Tomlinson", email: "Michael.Tomlinson@lcps.org" },
    ],
  },
  {
    name: "School Store",
    description: `CUSTEM Designs, the school store here at the Academies, is open for business!

We are open in person Tuesday - Friday from 1:15-1:45 pm. We do not have an online order store. We accept Mastercard, VISA, Debit Cards, Apple Pay, Cash or Checks.

Store Website`,
    sponsors: [{ name: "Sandra Tucker", email: "Sandra.Tucker@lcps.org" }],
  },
  {
    name: "Science Bowl (National)",
    description: `Science Bowl Club Description:

The U.S. Department of Energy National Science Bowl® is an incredibly prestigious nationwide academic competition that tests students’ knowledge in all areas of science and mathematics. Teams of 4 face-off in a fast-paced question-and-answer format, being tested on a range of science disciplines including biology, chemistry, Earth science, physics, energy, and math. More than 344,000 students have participated in the National Science Bowl® throughout its 34-year history, and it is one of the nation’s largest science competitions.

The Academies of Loudoun National Science Bowl Team will work together as a team to compete in school and regional STEM quiz bowl competitions. Please join! This will be an incredibly fun club!`,
    sponsors: [{ name: "Cos Fi", email: "Cos.Fi@lcps.org" }],
  },
  {
    name: "Science National Honor Society",
    sponsors: [{ name: "Samantha Spytek", email: "Samantha.Spytek@lcps.org" }],
  },
  {
    name: "Science Olympiad",
    sponsors: [{ name: "Jacob Voetberg", email: "Jacob.Voetberg@lcps.org" }],
  },
  {
    name: "SkillsUSA",
    description: `SkillsUSA is a partnership of students, teachers and industry working together to ensure America has a skilled workforce. We help each student excel. A nonprofit national education association, SkillsUSA serves middle-school, high-school and college/postsecondary students preparing for careers in trade, technical and skilled service occupations.

Co-curricular club, meeting are held in class sections as needed.

skillsusa

skillsusava`,
    sponsors: [{ name: "Deborah Tripp", email: "Deborah.Tripp@lcps.org" }],
  },
  {
    name: "Society of Women Engineers",
    description: "The mission of the Society of Women Engineers organization is to empower young women to pursue their interests in engineering and technology. Core pillars include developing leadership and confidence, and raising awareness about the field of engineering: its appeal and need for diversity.",
    sponsors: [{ name: "Octavia Williams", email: "Octavia.Williams@lcps.org" }],
  },
  {
    name: "STEMsters",
    description: "This club is a chapter of the nonprofit STEMsters which is focused on teaching young children about STEM. They partner with tutoring centers and teach young kids fun STEM lessons.",
    sponsors: [{ name: "Gerald Shapiro", email: "Gerald.Shapiro@lcps.org" }],
  },
  {
    name: "Student Council Association",
    description: `Statement

Develop and Support the Academies of Loudoun School Community

Coordinating events for the student body, including spirit activities

Creating a sense of unity and spirit among all divisions

Celebrate the achievements of our diverse student body

Act as a liaison between the faculty and students

Represent ideas from the student body

Be ambassadors of the ACL mission

The SCA is committed to helping develop our school community through a number of events including: Spirit Weeks and Nights, Field Days, and the Spring Formal.

The Academies of Loudoun Student Council Association is made up of representatives from each division on each day (A/B) who are selected by a general student body election that takes place at the beginning of September each year.

Learn More About SCA`,
    sponsors: [
      { name: "Jennifer Hiltner", email: "aclsc@lcps.org" },
      { name: "Erin Wissler", email: "Erin.Wissler@lcps.org" },
    ],
  },
  {
    name: "Technology Student Association (TSA)",
    description: `Motto: Learning to lead in a technical world.

The Technology Student Association (TSA) enhances personal development, leadership, and career opportunities in science, technology, engineering, and math (STEM), whereby members apply and integrate these concepts through intracurricular activities, competitions, and related programs.

Club meeting date: TBD

TSA Competition Information`,
    sponsors: [{ name: "Armando Garza", email: "Armando.Garza@lcps.org" }],
  },
  {
    name: "Unicef Club",
    description: "United Nations Children’s Fund is a United Nations organization that was established after the devastation of World War II in order to provide humanitarian and developmental assistance to children and mothers across the globe. For nearly 70 years, the United Nations Children's Fund has been putting children first, protecting their rights and providing the assistance and services they need to survive and thrive. Our ACL UNICEF Club will make a difference through local actions focused on advocating for children's rights, raising awareness, and community service. Make sure to join our Remind group for meeting dates and times: https://www.remind.com/join/aclunic.",
    sponsors: [{ name: "Christopher Bullard", email: "Christopher.Bullard@lcps.org" }],
  },
  {
    name: "Venture Club",
    description: "Venture Lab brings together students interested in artificial intelligence, computer science, technology, and entrepreneurship to learn practical skills, build real projects, and turn ideas into solutions that can help people inside and outside the school community.",
    sponsors: [{ name: "John Chapin", email: "John.Chapin@lcps.org" }],
  },
  {
    name: "VEX Robotics",
    description: `Academies of Loudoun VEX Robotics is a student-led club where students work together to design, build, program, and compete with robots in VEX Robotics competitions. Throughout the season, members gain hands-on experience in engineering, programming, teamwork, and more, as they build and improve their robots.

Description:

Each year, VEX releases a new competition game that challenges teams to create a robot capable of completing a variety of tasks. Our teams do everything, from brainstorming to building, programming, testing, and competing. We also help host robotics events at ACL, which gives our members the opportunity to support competitions and connect with a larger robotics community.

There is something for everyone in VEX, whether you’re interested in building, coding, designing, driving, or strategy. No previous robotics experience is required to join which is why VEX is a great place to learn new skills, make friends, and learn engineering in a fun and competitive environment!`,
    sponsors: [{ name: "John Chapin", email: "John.Chapin@lcps.org" }],
  },
  {
    name: "Women Who Win",
    description: "To help girls explore various potential future careers and develop service projects for women-based charities.",
    sponsors: [{ name: "Paul McKenzi", email: "Paul.McKenzi@lcps.org" }],
  },
  {
    name: "Yearbook",
    description: `The Academies of Loudoun Yearbook is a student/adviser-run publication that tells the story of the school year in words and pictures. It’s a history book and a memory book, but also a journalism laboratory that encourages students to learn through hands-on experience.

We plan, design via computer software, write, edit, and take pictures during the production of the yearbook with a goal of including everyone in the school. Students gain a sense of fulfillment both during and after production while gaining valuable skills in design, communication, and sales. We work hard throughout the year to make the yearbook a reality.

If interested, please request to join the Yearbook Club Schoology group by using the access code: 3WQH-XJQD-VZFNF

Follow us on Instagram for news and opportunities to be featured in the yearbook!: instagram.com/yearbookacl`,
    sponsors: [{ name: "Deborah Tripp", email: "Deborah.Tripp@lcps.org" }],
  },
  {
    name: "Young Researchers Academy at ACL",
    description: "This is a chapter of YRA. Essentially, we mentor middle schoolers through the Toshiba project to teach them research skills. We guide them through process of developing a research proposal, writing papers, and presenting at a symposium. We will teach them skills relating to research, writing, presentation, and collaboration.",
    sponsors: [{ name: "Cos Fi", email: "Cos.Fi@lcps.org" }],
  },
];

/** @param {string} name */
export function clubNameToSlug(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function listAllAclDirectoryClubs() {
  const removed = getRemovedClubSlugs();
  const staticSlugs = new Set(ACL_CLUBS.map((club) => clubNameToSlug(club.name)));
  const extras = getCustomClubs()
    .filter((club) => !staticSlugs.has(club.slug) && !removed.has(club.slug))
    .map((club) => ({ name: club.name, sponsors: club.sponsors }));
  return [...ACL_CLUBS, ...extras].filter((club) => !removed.has(clubNameToSlug(club.name)));
}

/** @param {string} slug */
export function getAclClubBySlug(slug) {
  const want = String(slug || "").trim();
  if (!want) return null;
  return listAllAclDirectoryClubs().find((club) => clubNameToSlug(club.name) === want) || null;
}

export function getAllAclClubSlugs() {
  return listAllAclDirectoryClubs().map((club) => clubNameToSlug(club.name));
}

export function getSortedAclClubOptions() {
  return listAllAclDirectoryClubs()
    .map((club) => ({ slug: clubNameToSlug(club.name), name: club.name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
