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
        title="Code4Community"
        showNavLinks={true}
      />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="prose prose-gray max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
          
          <div className="text-sm text-muted-foreground mb-8">
            Last updated: March 2026
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Code4Community (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy describes what information we collect when you use our web platform and associated services, how we use and store it, and your choices. By using the Service or creating an account, you agree to the practices described here.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect and Store</h2>
              
              <h3 className="text-xl font-semibold text-foreground mb-3">2.1 Account and Authentication Data</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  When you create an account or sign in, we collect and store:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Email address</strong> — used to create and identify your account, send password-reset and account-related communications, and communicate with you about the Service</li>
                  <li><strong>Display name and profile photo</strong> — if you sign in with a third-party provider (e.g., Google), we may receive and store the name and profile picture associated with that account for display within the Service</li>
                  <li><strong>Authentication provider and identifiers</strong> — we store which method you used to sign up (e.g., email/password or Google) and a unique user identifier so we can authenticate you and link your activity to your account</li>
                  <li><strong>Account creation and last sign-in timestamps</strong> — used for account management, security, and support</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">2.2 Data You Submit Through the Service</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  When you use tools or features that accept input (e.g., dashboards, forms, or project data), we may store the content you submit so we can provide the feature, persist your work, and improve the Service. This may include preferences, saved configurations, and any text or data you choose to upload or enter. We use this data solely to operate and improve the Service and to fulfill our obligations to you.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">2.3 Technical and Usage Information</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  We and our service providers automatically collect and store:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>IP address</strong> — for security, abuse prevention, and basic operation of the Service</li>
                  <li><strong>Browser type, version, and device information</strong> — to ensure compatibility and troubleshoot issues</li>
                  <li><strong>Log data</strong> — access logs, request metadata, and error logs necessary for operating, securing, and improving the Service</li>
                  <li><strong>Usage information</strong> — such as which features or pages you access and when, to understand how the Service is used and to improve it</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">2.4 Local Browser Storage</h3>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Some features may use your browser&apos;s local storage or cookies to keep session state, preferences, or temporary data on your device. This data stays on your device and can be cleared via your browser settings. We do not use it to track you across other sites.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>We use the information described above to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Create, maintain, and secure your account and authenticate you</li>
                  <li>Provide, operate, and improve the Service and the features you use</li>
                  <li>Send you account-related communications (e.g., password reset, important service notices)</li>
                  <li>Respond to your requests and provide support</li>
                  <li>Detect, prevent, and address abuse, fraud, and security issues</li>
                  <li>Comply with applicable law and enforce our Terms of Service</li>
                  <li>Analyze usage in aggregate to improve performance and user experience</li>
                </ul>
                <p>
                  We do not use your personal information for advertising or to build profiles for third-party marketing. We do not sell your personal information.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Data Storage and Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                Account data, data you submit through the Service, and technical logs are stored on our systems and with our service providers (including authentication and hosting infrastructure). We retain account and usage data for as long as your account is active and as needed to provide the Service, resolve disputes, and comply with legal obligations. After account closure or upon request where applicable, we may delete or anonymize your data in accordance with our retention policies and law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Third-Party Services</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  We use third-party services to operate the Service, including for authentication (e.g., Firebase/Google), hosting, and infrastructure. These providers process data on our behalf to provide the Service. Their handling of data is governed by their respective privacy policies and our agreements with them. We do not sell or share your personal information with third parties for their marketing purposes.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Disclosure of Information</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  We may disclose your information: (a) to service providers who assist in operating the Service under contractual obligations to protect data; (b) if required by law or to protect our rights, safety, or property; (c) in connection with a merger, sale, or other transfer of assets (with notice where required); or (d) with your consent. We do not sell your personal information.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Data Security</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  We implement reasonable technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction. These measures include secure authentication, encryption in transit where appropriate, access controls, and secure infrastructure. Despite these efforts, no method of transmission or storage over the internet is completely secure. You use the Service and provide your information at your own risk. To the fullest extent permitted by applicable law, we disclaim any liability for unauthorized access to our systems or your data, data breaches, security incidents, or any loss or misuse of your information arising from circumstances beyond our reasonable control, and you waive any claims against us in respect of such events.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Your Rights and Choices</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  You may access, update, or correct your account information (e.g., email, profile) through your account settings or by contacting us. You may request deletion of your account and associated data by contacting us; we will process such requests in accordance with our policies and applicable law. You may also have rights under local law to access, port, restrict processing, or object to certain uses of your data. To exercise these rights or for questions, contact us via our <a href="/contact" className="text-primary hover:underline">Contact</a> page. You can clear local browser storage via your browser settings.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Children&apos;s Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us and we will take steps to delete it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. International Transfers</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your information may be processed and stored in the United States or other jurisdictions where our service providers operate. By using the Service, you consent to such transfer and processing. We take steps to ensure your data receives an adequate level of protection in accordance with applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will post the revised policy on this page and update the &quot;Last updated&quot; date. Material changes may be communicated via the Service or email where appropriate. Your continued use after changes constitutes acceptance. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy or our privacy practices, please contact us via our <a href="/contact" className="text-primary hover:underline">Contact</a> page.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
