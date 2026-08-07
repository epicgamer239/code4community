import Image from "next/image";
import Link from "next/link";
import HomeTestimonials from "@/components/home/HomeTestimonials";

/** Server-rendered home sections (not in the client Home bundle). */
export default function HomePageSections() {
  return (
    <>
      <section className="relative bg-white overflow-hidden border-t border-border">
        <div
          className="pointer-events-none absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full opacity-60"
          style={{ background: "radial-gradient(circle, rgba(196,181,253,0.55) 0%, rgba(255,255,255,0) 70%)" }}
          aria-hidden
        />
        <div className="relative max-w-6xl mx-auto px-6 md:px-10 lg:px-12 py-16 md:py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="max-w-xl">
            <p className="text-2xl md:text-3xl font-medium text-[#7c8cf0] mb-3">
              We are
            </p>
            <h2 className="text-2xl md:text-3xl lg:text-[2rem] font-bold text-foreground leading-snug mb-5">
              Broad Run High School&apos;s student-led collective for charitable software development.
            </h2>
            <p className="text-base text-foreground leading-relaxed mb-8">
              Code4Community is led by students who are passionate about building meaningful products.
              Members learn the fundamentals of product and software development while contributing
              real tools to organizations in our community.
            </p>
            <Link
              href="/about"
              className="inline-flex items-center px-5 py-2.5 text-sm font-bold text-foreground bg-[#efe8f8] border-[1.5px] border-foreground shadow-[4px_4px_0_0_#2a2a2a] hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0_0_#2a2a2a] transition-all"
            >
              Meet Our Team
            </Link>
          </div>

          <div className="w-full">
            <div className="relative w-full aspect-[4/3] border-[2.5px] border-[#2a2a2a] shadow-[8px_8px_0_0_#2a2a2a] bg-[#2a2a2a]">
              <Image
                src="/group-pics/IMG_4044.png"
                alt="Code4Community team"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-t border-border">
        <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-12 py-16 md:py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="w-full order-2 lg:order-1">
            <div className="relative w-full aspect-[4/3] border-[2.5px] border-[#2a2a2a] shadow-[8px_8px_0_0_#2a2a2a] bg-[#2a2a2a]">
              <Image
                src="/group-pics/IMG_4048.png"
                alt="Code4Community members collaborating"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="max-w-xl order-1 lg:order-2">
            <h2 className="text-2xl md:text-3xl lg:text-[2rem] font-bold text-foreground leading-snug mb-5">
              Delivering impactful, deliberate and inclusive software at no cost.
            </h2>
            <p className="text-base text-foreground leading-relaxed mb-8">
              Community organizations need tools like event trackers, volunteer systems, and dashboards—but hiring developers is often too expensive. Code4Community was built so local nonprofits and small groups can get practical software without that barrier.
            </p>
            <Link
              href="/work"
              className="inline-flex items-center px-5 py-2.5 text-sm font-bold text-[#4c3d6e] bg-[#efe8f8] border-[1.5px] border-foreground shadow-[4px_4px_0_0_#2a2a2a] hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0_0_#2a2a2a] transition-all"
            >
              Learn More About Our Partners
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white border-t border-border">
        <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-12 py-16 md:py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="max-w-xl">
            <h2 className="text-2xl md:text-3xl lg:text-[2rem] font-bold text-foreground leading-snug mb-5">
              Empowering through tech, fostering diversity, and leaving a lasting impact.
            </h2>
            <p className="text-base text-foreground leading-relaxed mb-8">
              Code4Community is a dynamic and inclusive community that empowers students with aspirations in tech.
              We foster collaboration, skill development, and real-world experience—creating a supportive space for students to grow in software development, product management, and design while serving our community.
            </p>
            <Link
              href="/about"
              className="inline-flex items-center px-5 py-2.5 text-sm font-bold text-foreground bg-[#efe8f8] border-[1.5px] border-foreground shadow-[4px_4px_0_0_#2a2a2a] hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0_0_#2a2a2a] transition-all"
            >
              Learn More
            </Link>
          </div>

          <div className="w-full">
            <div className="relative w-full aspect-[4/3] border-[2.5px] border-[#2a2a2a] shadow-[8px_8px_0_0_#2a2a2a] bg-[#2a2a2a]">
              <Image
                src="/group-pics/IMG_2492.png"
                alt="Code4Community students making an impact"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <HomeTestimonials />
    </>
  );
}
