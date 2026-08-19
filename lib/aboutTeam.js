export const ABOUT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80";

export const STUDENT_BIO =
  "A sophomore at Broad Run High School who realized their skills could help the community and decided to join Code4Community to pitch in.";

export const leadership = [
  {
    name: "Shail Shah",
    role: "President & Head Developer",
    image: "/team/shail.jpg",
    bio: "Has over five years of experience in the software industry. An experienced programmer and software architect with leadership skills and an entrepreneurial drive, he started Code4Community in 2023.",
  },
  {
    name: "Pranav Natarajan",
    role: "Co President & Head of Outreach",
    image: "/team/pranav.jpg",
    bio: "Has over three years of experience in the product engineering industry. He collaborates with clients, plans and executes technical efforts aimed at software development, mediating between various departments, involving them in work, and coordinating activities.",
  },
  {
    name: "Aryan Kothari",
    role: "Vice President & Developer",
    image: "/team/aryan.jpg",
    bio: "Has over two years of experience in the software industry. As vice president and developer, he works on the development of software solutions contracted by a company.",
  },
];

export const members = [
  { name: "Armaan Yadav", role: "Developer", image: "/team/armaan.jpg", bio: STUDENT_BIO, active: false },
  { name: "Graisen Edwards", role: "Developer", image: "/team/graisen.jpg", bio: STUDENT_BIO, active: false },
  { name: "Joseph Ferrigno", role: "Developer", image: "/team/joseph.jpg", bio: STUDENT_BIO },
  { name: "Luke Swanson", role: "Developer", image: "/team/luke.jpg", bio: STUDENT_BIO },
  { name: "Aneesh Lavu", role: "Developer", image: "/team/aneesh.jpg", bio: STUDENT_BIO },
  { name: "Ishir Aggarwal", role: "Developer", image: "/team/ishir.jpg", bio: STUDENT_BIO },
];

/** Members shown on the About Us page. */
export const activeMembers = members.filter((m) => m.active !== false);
