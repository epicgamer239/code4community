"use client";
import { useLayoutEffect } from "react";
import DashboardTopBar from "../../components/DashboardTopBar";
import Footer from "../../components/Footer";

export default function Contact() {
  useLayoutEffect(() => {
    document.title = "Code4Community | Contact";
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopBar title="Code4Community" showNavLinks={true} />

      {/* Hero: grid extends up to top bar (pull up over the header's margin) */}
      <div className="relative min-h-[28vh] flex flex-col justify-center px-6 py-12 lg:py-16 lg:px-8 xl:px-12 overflow-hidden -mt-6">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto w-full">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Contact Us
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Reach out for inquiries, partnerships, or questions about our services.
          </p>
        </div>
      </div>

      {/* Contact details */}
      <div className="border-t border-border bg-muted/20">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="space-y-8">
            <div>
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">Email</h2>
              <a href="mailto:brhsc4c@gmail.com" className="text-lg text-primary hover:underline">
                brhsc4c@gmail.com
              </a>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">Response time</h2>
              <p className="text-muted-foreground">
                We typically respond within 1–2 business days. For urgent matters, say so in the subject line.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">What we can help with</h2>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li>Custom software development</li>
                <li>Partnership opportunities</li>
                <li>Technical consultations</li>
                <li>General inquiries and support</li>
              </ul>
            </div>
          </div>
          <p className="mt-10 text-sm text-muted-foreground">
            <strong className="text-foreground">Shail Shah, Aryan Kothari, and Pranav Natarajan</strong> lead Code4Community and are the main points of contact.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
