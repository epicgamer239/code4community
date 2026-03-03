"use client";

import { useLayoutEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const stats = [
  { label: "Total raised", value: "$124,580", change: "+12%", up: true },
  { label: "Donors this month", value: "342", change: "+8%", up: true },
  { label: "Avg. gift", value: "$364", change: "+5%", up: true },
  { label: "Recurring donors", value: "89", change: "+23%", up: true },
];

const donations = [
  { name: "Sarah M.", amount: "$500", date: "Today", campaign: "Annual Fund" },
  { name: "James K.", amount: "$250", date: "Today", campaign: "Capital Campaign" },
  { name: "Donor Foundation", amount: "$10,000", date: "Yesterday", campaign: "General" },
  { name: "Emily R.", amount: "$75", date: "Yesterday", campaign: "Annual Fund" },
  { name: "Tech Corp", amount: "$5,000", date: "Mar 1", campaign: "Matching Gift" },
  { name: "Anonymous", amount: "$1,000", date: "Mar 1", campaign: "Annual Fund" },
];

// Daily giving in dollars (last 7 days) — realistic variation: mid-week dip, weekend bump
const givingChartData = [
  { day: "Mon", amount: 4200 },
  { day: "Tue", amount: 1850 },
  { day: "Wed", amount: 3100 },
  { day: "Thu", amount: 2400 },
  { day: "Fri", amount: 5200 },
  { day: "Sat", amount: 6800 },
  { day: "Sun", amount: 4100 },
];
const givingMax = Math.max(...givingChartData.map((d) => d.amount));

export default function DonorDashboardDemo() {
  useLayoutEffect(() => {
    document.title = "Donor Dashboard | Code4Community Demo";
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Demo bar */}
      <div className="bg-foreground text-background px-4 py-2 flex items-center justify-between text-sm">
        <span className="font-medium">Donor Dashboard — Demo</span>
        <Link href="/" className="text-background/80 hover:text-white transition-colors">
          ← Back to Code4Community
        </Link>
      </div>

      {/* App chrome */}
      <div className="flex">
        <aside className="w-56 min-h-[calc(100vh-2.5rem)] bg-background border-r border-border hidden md:block">
          <div className="p-4 border-b border-border">
            <Image src="/c4c.png" alt="C4C" width={32} height={32} />
          </div>
          <nav className="p-3 space-y-0.5">
            {["Dashboard", "Donors", "Campaigns", "Reports", "Settings"].map((item, i) => (
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
              <h1 className="text-2xl font-bold text-foreground">Donor dashboard</h1>
              <p className="text-muted-foreground text-sm mt-1">Track giving and campaign performance</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map((s) => (
                <div key={s.label} className="bg-background rounded-xl border border-border p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                  <p className={`text-xs font-medium mt-1 ${s.up ? "text-emerald-600" : "text-destructive"}`}>
                    {s.change} from last month
                  </p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Chart */}
              <div className="lg:col-span-2 bg-background rounded-xl border border-border p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground mb-4">Giving over time</h2>
                <div className="flex gap-3 items-stretch">
                  <div className="flex flex-col justify-between text-xs text-muted-foreground shrink-0 py-0.5">
                    <span>${(givingMax / 1000).toFixed(0)}k</span>
                    <span>${(givingMax * 0.75 / 1000).toFixed(0)}k</span>
                    <span>${(givingMax * 0.5 / 1000).toFixed(0)}k</span>
                    <span>${(givingMax * 0.25 / 1000).toFixed(0)}k</span>
                    <span>$0</span>
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
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 w-px"
                          style={{ left: `${(i / 7) * 100}%`, backgroundColor: "#cbd5e1" }}
                        />
                      ))}
                      {/* Bars - use pixel height so they always render */}
                      <div className="absolute inset-0 flex items-end justify-around gap-1 px-2 pb-1">
                        {givingChartData.map((d, i) => {
                          const barHeightPx = Math.max(4, Math.round((d.amount / givingMax) * 120));
                          return (
                            <div
                              key={i}
                              className="flex-1 flex flex-col justify-end items-center max-w-[44px] min-w-0"
                              style={{ height: "100%" }}
                              title={`$${d.amount.toLocaleString()}`}
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
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      {givingChartData.map((d) => (
                        <span key={d.day}>{d.day}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent activity */}
              <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground mb-4">Recent activity</h2>
                <div className="space-y-3">
                  {donations.slice(0, 4).map((d, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.campaign}</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">{d.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Donations table */}
            <div className="mt-6 bg-background rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Recent donations</h2>
                <button type="button" className="text-xs font-medium text-primary hover:underline">
                  View all →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground">
                      <th className="text-left px-6 py-3 font-medium">Donor</th>
                      <th className="text-left px-6 py-3 font-medium">Campaign</th>
                      <th className="text-right px-6 py-3 font-medium">Amount</th>
                      <th className="text-right px-6 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d, i) => (
                      <tr key={i} className="border-t border-border hover:bg-muted/30">
                        <td className="px-6 py-4 font-medium text-foreground">{d.name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{d.campaign}</td>
                        <td className="px-6 py-4 text-right font-semibold text-foreground">{d.amount}</td>
                        <td className="px-6 py-4 text-right text-muted-foreground">{d.date}</td>
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
