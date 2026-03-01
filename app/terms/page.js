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
        title="Terms of Service" 
        showNavLinks={false}
      />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="prose prose-gray max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
          
          <div className="text-sm text-muted-foreground mb-8">
            Last updated: January 2026
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using Code4Community (&quot;the Service&quot;), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                Code4Community is a web platform operated by Code4Community. The Service provides tools including a Grade Calculator and Yearbook Formatting tool. All tools are available for use without requiring user accounts or authentication.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. No User Accounts Required</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  The Service does not require user accounts, authentication, or registration. All tools are available for immediate use without creating an account or providing any personal information.
                </p>
                <p>
                  You may use the Service anonymously. No personal data is collected, stored, or processed.
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
                  <li>Interfere with or disrupt the Service or servers</li>
                  <li>Attempt to gain unauthorized access to any part of the Service</li>
                  <li>Use the Service for any commercial purpose without permission</li>
                  <li>Engage in any behavior that disrupts the service or other users</li>
                  <li>Use automated tools to abuse or overload the Service</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Tool Usage</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  The Service provides tools for use by individuals and organizations. When using these tools:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All data processing occurs locally in your browser</li>
                  <li>No data is transmitted to our servers or stored by us</li>
                  <li>You are responsible for the accuracy of any data you input</li>
                  <li>Tools are provided &quot;as is&quot; for general use</li>
                  <li>Results should be verified independently when used for official purposes</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service and its original content, features, and functionality are owned by Code4Community and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices. We do not collect, store, or process any personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. Code4Community expressly disclaims all warranties of any kind, whether express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, and non-infringement. Results from tools should be verified independently when used for official purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                In no event shall Code4Community, its officers, directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service or reliance on any results generated by the tools.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Service Availability</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify, suspend, or discontinue the Service at any time, with or without notice. Since no user accounts exist, there are no accounts to terminate. Access to the Service may be restricted if you violate these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide notice by updating the &quot;Last updated&quot; date on this page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be interpreted and governed by the laws of the Commonwealth of Virginia, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">13. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us via our <a href="/contact" className="text-primary hover:underline">Contact</a> page.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
