"use client";

import Link from "next/link";
import Image from "next/image";
import { AppPageLayout } from "@/components/common/AppPageLayout";
import { ACL_CLUB_HUB_CONFIG } from "@/lib/club-hub/schoolConfig";

const brand = ACL_CLUB_HUB_CONFIG.brand;

export default function AclPortalPage() {
  return (
    <AppPageLayout title="Code4Community">
      <div className="relative isolate flex min-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden bg-[#eef5f8]">
        <div
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            backgroundImage: `radial-gradient(circle at 12% 0%, ${brand.accent}40, transparent 45%), radial-gradient(circle at 90% 18%, #48b84833, transparent 40%)`,
          }}
          aria-hidden
        />

        <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-6 sm:px-6 sm:py-8">
          <div className="relative overflow-hidden rounded-2xl shadow-[0_16px_48px_rgba(1,51,103,0.18)]">
            <div className="relative px-5 pb-5 pt-6 text-center sm:px-8 sm:pb-6 sm:pt-7">
              <Image
                src={brand.bannerImage}
                alt=""
                fill
                priority
                className="object-cover object-[center_35%]"
                sizes="(max-width: 768px) 100vw, 768px"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, ${brand.primaryDark}c2 0%, ${brand.primaryDark}99 55%, ${brand.primaryDark}e8 100%)`,
                }}
                aria-hidden
              />
              <div className="relative z-10 flex flex-col items-center">
                <Image
                  src="/acl/logo-sm.png"
                  alt="Academies of Loudoun"
                  width={180}
                  height={146}
                  className="h-auto w-[6.75rem] mix-blend-screen sm:w-[7.75rem]"
                  priority
                />
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.4)] sm:text-4xl">
                  Choose Your Tool
                </h1>
                <p className="mt-1.5 max-w-md text-sm text-white/95 [text-shadow:0_1px_10px_rgba(0,0,0,0.35)] sm:text-base">
                  Tools built for ACL students and staff. More coming soon.
                </p>
              </div>
            </div>

            <Link
              href="/acl/club-hub"
              className="group block bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-inset"
              style={{ ["--tw-ring-color"]: `${brand.primary}66` }}
            >
              <article className="grid sm:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
                <div className="relative min-h-[9.5rem] bg-slate-100 sm:min-h-[10.5rem]">
                  <Image
                    src={brand.defaultClubHeaderImage}
                    alt=""
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 100vw, 380px"
                  />
                  <div
                    className="absolute inset-0 sm:hidden"
                    style={{
                      background: `linear-gradient(to top, ${brand.primaryDark}d9 0%, transparent 55%)`,
                    }}
                    aria-hidden
                  />
                  <p className="absolute bottom-3 left-0 right-0 text-center text-base font-bold text-white drop-shadow sm:hidden">
                    Club Directory
                  </p>
                </div>
                <div className="flex flex-col justify-center px-5 py-5 text-left sm:px-7 sm:py-6">
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: brand.accent }}
                  >
                    Available now
                  </p>
                  <h2 className="mt-1.5 text-xl font-bold sm:text-2xl" style={{ color: brand.primary }}>
                    Club Directory
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    Browse clubs, join, and manage rosters for Academies of Loudoun.
                  </p>
                  <span
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition group-hover:gap-2.5"
                    style={{ color: brand.primary }}
                  >
                    Open Club Hub
                    <span aria-hidden>→</span>
                  </span>
                </div>
              </article>
            </Link>
          </div>
        </section>
      </div>
    </AppPageLayout>
  );
}
