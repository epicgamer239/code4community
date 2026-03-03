"use client";
import { useLayoutEffect } from "react";
import DashboardTopBar from "../../components/DashboardTopBar";

export default function TermsOfService() {
  useLayoutEffect(() => {
    document.title = "Code4Community | Terms of Service";
  }, []);
  
  return (
    <div className="min-h-screen bg-background">
      <DashboardTopBar
        title="Code4Community"
        showNavLinks={true}
      />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="prose prose-gray max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
          
          <div className="text-sm text-muted-foreground mb-8">
            Last updated: March 2026
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Code4Community (&quot;the Service&quot;), including by creating an account, you accept and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you must not use the Service or create an account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                Code4Community is a web platform that provides applications and tools for nonprofits and other organizations, including dashboards, data tools, and productivity applications. Certain features may require you to create an account and sign in. We collect and process information as described in our Privacy Policy in order to operate the Service and provide account-based features.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Accounts and Registration</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  You may be required to register for an account to access certain parts of the Service. You must provide accurate and complete information and keep your account credentials secure. You are responsible for all activity under your account.
                </p>
                <p>
                  We may suspend or terminate your account if you breach these Terms or for any other reason at our discretion. You may stop using the Service at any time; account data will be handled in accordance with our Privacy Policy and data retention practices.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Acceptable Use</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>You agree not to use the Service to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Transmit any harmful, threatening, abusive, or harassing content</li>
                  <li>Impersonate any person or entity or misrepresent your affiliation</li>
                  <li>Interfere with or disrupt the Service or its infrastructure</li>
                  <li>Attempt to gain unauthorized access to the Service, other accounts, or our systems</li>
                  <li>Use the Service for any commercial purpose without our prior written permission</li>
                  <li>Scrape, automate access, or overload the Service in a manner that harms availability or other users</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Use of Tools and Data</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  When using our tools and applications:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You are responsible for the accuracy and lawfulness of any data you provide</li>
                  <li>Tools and results are provided &quot;as is&quot;; you should verify results independently when used for official or high-stakes purposes</li>
                  <li>Data you submit through the Service may be stored and processed as described in our Privacy Policy</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service and its content, features, and functionality (excluding content you submit) are owned by Code4Community and are protected by applicable intellectual property laws. You may not copy, modify, or create derivative works of the Service without our permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Privacy and Data</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our collection, use, and storage of your information, including account and usage data, are described in our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>. By using the Service, you consent to those practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. Code4Community disclaims all warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, secure, or error-free. You use the Service at your own risk.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Limitation of Liability</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  To the maximum extent permitted by applicable law, Code4Community and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages (including loss of profits, data, goodwill, or business opportunity) arising from your use of the Service, your account, or your reliance on any content or tools provided through the Service.
                </p>
                <p>
                  Without limiting the above, we shall not be liable for any damages or losses resulting from unauthorized access to your account or our systems, data breaches, security incidents, loss or corruption of data, or any failure to maintain or protect the security of the Service or user data. You acknowledge that no system is completely secure and that you use the Service at your own risk with respect to the security and confidentiality of your information.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Service Availability and Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may modify, suspend, or discontinue the Service or any part of it at any time, with or without notice. We may suspend or terminate your account for breach of these Terms or for operational or legal reasons. Upon termination, your right to use the Service ceases; we may retain and use account and usage data as described in our Privacy Policy and as required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these Terms at any time. We will post the revised Terms on this page and update the &quot;Last updated&quot; date. Your continued use of the Service after changes constitutes acceptance. If you do not agree, you must stop using the Service and may close your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of the Commonwealth of Virginia, without regard to conflict of law principles. Any dispute shall be resolved in the state or federal courts located in Virginia.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">13. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms, please contact us via our <a href="/contact" className="text-primary hover:underline">Contact</a> page.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
