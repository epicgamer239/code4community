import { Merriweather } from "next/font/google";

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

/**
 * Merriweather only on /about — keeps extra stylesheets off every other route.
 */
export default function AboutLayout({ children }) {
  return <div className={merriweather.className}>{children}</div>;
}
