import { Lexend_Deca, Open_Sans } from "next/font/google";

/** Gynzy-style typography for seating chart only (server layout — avoids Turbopack + client next/font issues). */
const seatingOpenSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-seating-open",
  display: "swap",
});

const seatingLexendDeca = Lexend_Deca({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-seating-lexend",
  display: "swap",
});

export const metadata = {
  title: "Seating Chart",
  description: "Classroom seating chart tool for Broad Run teachers.",
};

export default function SeatingChartLayout({ children }) {
  return (
    <div className={`${seatingOpenSans.variable} ${seatingLexendDeca.variable} min-h-screen`}>
      {children}
    </div>
  );
}
