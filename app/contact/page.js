import { AppPageLayout } from "@/components/common/AppPageLayout";

export const metadata = {
  title: "Code4Community | Contact",
};

export const dynamic = "force-static";

export default function ContactPage() {
  return (
    <AppPageLayout>
      <div className="max-w-3xl mx-auto px-6 py-14 md:py-20 w-full">
        <header className="border-b border-border pb-8 mb-10">
          <h1 className="text-3xl md:text-[2.5rem] font-semibold text-foreground tracking-tight">
            Contact
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground leading-relaxed max-w-xl">
            For project inquiries, partnerships, or general questions, email us and we&apos;ll get back to you.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-8 gap-y-8 text-[15px]">
          <div className="text-muted-foreground font-medium">Email</div>
          <div>
            <a
              href="mailto:brhsc4c@gmail.com"
              className="text-foreground font-medium underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors"
            >
              brhsc4c@gmail.com
            </a>
          </div>

          <div className="text-muted-foreground font-medium">Response</div>
          <div className="text-foreground leading-relaxed">
            Within 1–2 business days. Mark urgent requests in the subject line.
          </div>

          <div className="text-muted-foreground font-medium">Inquiries</div>
          <div className="text-foreground leading-relaxed">
            Software development, partnerships, technical consultations, and general support.
          </div>

          <div className="text-muted-foreground font-medium">Leadership</div>
          <div className="text-foreground leading-relaxed">
            Shail Shah, Aryan Kothari, and Pranav Natarajan
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
