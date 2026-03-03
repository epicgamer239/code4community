"use client";

import { useLayoutEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const kpis = [
  { label: "Program participants", value: "2,847", target: "3,000", pct: 95 },
  { label: "Completion rate", value: "94%", target: "90%", pct: 104 },
  { label: "Avg. satisfaction", value: "4.8 / 5", target: "4.5", pct: 107 },
  { label: "Grant deliverables", value: "12 / 12", target: "12", pct: 100 },
];

const programs = [
  { name: "After-school tutoring", participants: 420, budget: "$85K", status: "On track" },
  { name: "Community meals", participants: 1200, budget: "$120K", status: "On track" },
  { name: "Job readiness", participants: 380, budget: "$95K", status: "Ahead" },
  { name: "Youth mentorship", participants: 156, budget: "$45K", status: "On track" },
];

// Monthly participation (Jan–Dec) — realistic growth with seasonal dip in summer
const participationTrend = [420, 485, 552, 598, 645, 612, 588, 672, 748, 825, 892, 948];
const participationMax = Math.max(...participationTrend);

export default function ReportingDemo() {
  useLayoutEffect(() => {
    document.title = "Program Reporting | Code4Community Demo";
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Demo bar */}
      <div className="bg-foreground text-background px-4 py-2 flex items-center justify-between text-sm">
        <span className="font-medium">Program Reporting — Demo</span>
        <Link href="/" className="text-background/80 hover:text-white transition-colors">
          ← Back to Code4Community
        </Link>
      </div>

      <div className="flex">
        <aside className="w-56 min-h-[calc(100vh-2.5rem)] bg-background border-r border-border hidden md:block">
          <div className="p-4 border-b border-border">
            <Image src="/c4c.png" alt="C4C" width={32} height={32} />
          </div>
          <nav className="p-3 space-y-0.5">
            {["Overview", "Programs", "Outcomes", "Exports", "Settings"].map((item, i) => (
              <div
                key={item}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground">Program reporting</h1>
              <p className="text-muted-foreground text-sm mt-1">Q1 2026 · Grant deliverables & outcomes</p>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {kpis.map((k) => (
                <div key={k.label} className="bg-background rounded-xl border border-border p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{k.value}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(k.pct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-emerald-600">{k.pct}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Target: {k.target}</p>
                </div>
              ))}
            </div>

            {/* Chart + table */}
            <div className="grid lg:grid-cols-5 gap-6 mb-6">
              <div className="lg:col-span-3 bg-background rounded-xl border border-border p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground mb-4">Participation trend</h2>
                <div className="flex gap-2 items-stretch">
                  <div className="flex flex-col justify-between text-xs text-muted-foreground shrink-0 py-0.5">
                    <span>{participationMax}</span>
                    <span>{Math.round(participationMax * 0.75)}</span>
                    <span>{Math.round(participationMax * 0.5)}</span>
                    <span>{Math.round(participationMax * 0.25)}</span>
                    <span>0</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="h-[140px] rounded-lg relative overflow-hidden" style={{ backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                      {/* Horizontal grid lines */}
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="absolute left-0 right-0"
                          style={{ top: `${i * 25}%`, height: "1px", backgroundColor: "#cbd5e1" }}
                        />
                      ))}
                      {/* Vertical grid lines */}
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 w-px"
                          style={{ left: `${(i / 12) * 100}%`, backgroundColor: "#cbd5e1" }}
                        />
                      ))}
                      {/* Bars - use pixel height so they always render */}
                      <div className="absolute inset-0 flex items-end justify-around gap-0.5 px-1 pb-1">
                        {participationTrend.map((val, i) => {
                          const barHeightPx = Math.max(4, Math.round((val / participationMax) * 120));
                          return (
                            <div
                              key={i}
                              className="flex-1 flex flex-col justify-end items-center max-w-[32px] min-w-0"
                              style={{ height: "100%" }}
                              title={`${val} participants`}
                            >
                              <div
                                className="w-full rounded-t"
                                style={{
                                  height: `${barHeightPx}px`,
                                  backgroundColor: "#3b82f6",
                                  backgroundImage: "linear-gradient(to top, rgba(59, 130, 246, 0.9), #3b82f6)",
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground pl-6">
                      {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
                        <span key={m}>{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 bg-background rounded-xl border border-border p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground mb-4">By program</h2>
                <div className="space-y-3">
                  {programs.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground truncate pr-2">{p.name}</span>
                      <span className="text-sm text-muted-foreground shrink-0">{p.participants}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Programs table */}
            <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Program summary</h2>
                <button type="button" className="text-xs font-medium text-primary hover:underline">
                  Export report →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground">
                      <th className="text-left px-6 py-3 font-medium">Program</th>
                      <th className="text-right px-6 py-3 font-medium">Participants</th>
                      <th className="text-right px-6 py-3 font-medium">Budget</th>
                      <th className="text-right px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs.map((p, i) => (
                      <tr key={i} className="border-t border-border hover:bg-muted/30">
                        <td className="px-6 py-4 font-medium text-foreground">{p.name}</td>
                        <td className="px-6 py-4 text-right text-foreground">{p.participants}</td>
                        <td className="px-6 py-4 text-right text-muted-foreground">{p.budget}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
