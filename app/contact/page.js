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
      <DashboardTopBar 
        title="Code4Community" 
        showNavLinks={true}
      />

      {/* Hero Section */}
      <div className="bg-[#0066CC] text-white py-16 md:py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Get in Touch
          </h1>
          <p className="text-base md:text-lg leading-relaxed max-w-3xl mx-auto text-white">
            We'd love to hear from you. Reach out to us for inquiries, partnerships, or any questions about our services.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Contact Information */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              Official Contact
            </h2>
            <p className="text-muted-foreground mb-4">
              <strong className="text-foreground">Shail Shah, Aryan Kothari, and Pranav Natarajan</strong> lead Code4Community 
              and run this site. They are the point of contact for any inquiries about our tools or this project.
            </p>
            <p className="text-muted-foreground mb-6">
              You can reach us at the email below.
            </p>
            <div className="bg-background border border-border rounded-lg p-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Email
                  </h3>
                  <a 
                    href="mailto:brhsc4c@gmail.com" 
                    className="text-primary hover:underline text-lg"
                  >
                    brhsc4c@gmail.com
                  </a>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Response Time
                  </h3>
                  <p className="text-muted-foreground">
                    We typically respond within 1–2 business days. 
                    For urgent matters, please indicate so in your email subject line.
                  </p>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    What We Can Help With
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Custom software development projects</li>
                    <li>Partnership opportunities</li>
                    <li>Technical consultations</li>
                    <li>General inquiries about our services</li>
                    <li>Support and feedback</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>

      <Footer />
    </div>
  );
}
