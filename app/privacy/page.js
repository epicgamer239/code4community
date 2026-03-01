"use client";
import { useLayoutEffect } from "react";
import DashboardTopBar from "../../components/DashboardTopBar";

export default function PrivacyPolicy() {
  useLayoutEffect(() => {
    document.title = "Code4Community | Privacy Policy";
  }, []);
  
  return (
    <div className="min-h-screen bg-background">
      <DashboardTopBar 
        title="Privacy Policy" 
        showNavLinks={false}
      />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="prose prose-gray max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
          
          <div className="text-sm text-muted-foreground mb-8">
            Last updated: January 2026
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Code4Community (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains our practices regarding the Code4Community web platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-foreground mb-3">2.1 No Personal Data Collection</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  <strong>We do not collect, store, or process any personal information.</strong> Our Service operates entirely without user accounts, authentication, or data collection. All tools are available for use without requiring any personal information.
                </p>
                <p>
                  The tools provided (Grade Calculator and Yearbook Formatting) process data locally in your browser. No data is transmitted to our servers or stored by us.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">2.2 Local Browser Storage</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Some tools may use your browser&apos;s local storage to temporarily store data for your convenience (such as preserving your input while using a tool). This data:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Remains entirely on your device</li>
                  <li>Is never transmitted to our servers</li>
                  <li>Can be cleared at any time through your browser settings</li>
                  <li>Is not accessible to us or any third parties</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">2.3 Technical Information</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Our hosting provider may automatically collect standard technical information that is common to all web services:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>IP address (for basic security and routing)</li>
                  <li>Browser type and version</li>
                  <li>Device information</li>
                  <li>Access logs (standard web server logs)</li>
                </ul>
                <p>
                  This information is used only for basic website operation and security. We do not use this information to identify or track individual users.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Information</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Since we do not collect personal information, there is no personal data to use. Any technical information collected by our hosting provider is used solely for:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Basic website operation and functionality</li>
                  <li>Security and abuse prevention</li>
                  <li>Technical troubleshooting</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Data Storage</h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not store any personal data. All tool functionality operates entirely in your browser. Any data you input is processed locally and is never sent to our servers or stored by us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Third-Party Services</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>Our Service is hosted using standard web hosting services. We do not use third-party authentication, analytics, or data collection services.</p>
                <p>
                  Our hosting provider may have access to standard web server logs as part of normal hosting operations. We encourage you to review their privacy policies if you have concerns.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Data Sharing and Disclosure</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  <strong>We do not collect or store personal data, so there is no personal data to share or disclose.</strong>
                </p>
                <p>
                  We do not sell, trade, or transfer any information to third parties. Standard web server logs maintained by our hosting provider are subject to their own privacy policies.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Your Rights</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Since we do not collect personal information, there is no personal data to access, correct, or delete. You have full control over any data stored locally in your browser, which you can clear at any time through your browser settings.
                </p>
                <p>
                  If you have any questions or concerns, please contact us via our <a href="/contact" className="text-primary hover:underline">Contact</a> page.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not retain any personal data because we do not collect any. Any data you input into our tools remains in your browser&apos;s local storage and can be cleared by you at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Children&apos;s Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our Service is designed for general use by individuals and organizations. Since we do not collect any personal information, we do not collect information from children or any users. All tools operate without requiring any personal data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">
                  For contact details, please visit our <a href="/contact" className="text-primary hover:underline">Contact</a> page.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
