import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24">
    <h2 className="font-heading text-xl font-bold text-foreground">{title}</h2>
    <div className="mt-3 space-y-3 text-muted-foreground">{children}</div>
  </section>
);

const Terms = () => {
  const effective = "July 8, 2026";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms of Service — Heartify"
        description="The terms that govern your use of Heartify's halal-first video curation service."
        path="/terms"
      />
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <header>
          <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Effective date: {effective}</p>
          <p className="mt-4 text-sm text-foreground/90">
            These Terms of Service ("Terms") govern your access to and use of the
            Heartify website, mobile applications, and related services
            (collectively, the "Service") operated by Heartify ("we", "us",
            "our"). By creating an account or using the Service, you agree to be
            bound by these Terms and by our{" "}
            <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
            If you do not agree, do not use the Service.
          </p>
        </header>

        <div className="mt-10 space-y-10">
          <Section id="eligibility" title="1. Eligibility">
            <p>
              You must be at least 13 years old to create an account. Users under 18
              must have permission from a parent or legal guardian. The Service is
              not directed to children under 13, and we do not knowingly collect
              personal information from them. If you believe a child under 13 has
              provided us information, contact us at privacy@heartify.app and we
              will delete it.
            </p>
          </Section>

          <Section id="account" title="2. Account & Security">
            <p>
              You are responsible for maintaining the confidentiality of your
              credentials and for all activity under your account. You agree to
              notify us immediately of any unauthorized use. We may suspend or
              terminate accounts that violate these Terms, engage in abuse, or
              pose a risk to other users.
            </p>
            <p>
              You may delete your account at any time from your profile settings.
              Deletion removes your profile, favorites, watch history, playback
              positions, device tokens, and other personal data. Aggregated,
              anonymised analytics may be retained.
            </p>
          </Section>

          <Section id="content" title="3. Content & Curation">
            <p>
              Heartify curates and surfaces third-party video content (primarily
              from YouTube) using automated and manual moderation systems. We do
              not host, own, or claim rights to third-party content. Playback of
              YouTube videos through our Service is subject to the{" "}
              <a
                href="https://www.youtube.com/t/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >YouTube Terms of Service</a>{" "}
              and the{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >Google Privacy Policy</a>. Curation reflects our editorial
              judgement of what fits a halal-first experience; we do not
              guarantee doctrinal endorsement of any specific piece of content.
            </p>
          </Section>

          <Section id="acceptable-use" title="4. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Reverse engineer, scrape, or bulk-download the Service or its APIs.</li>
              <li>Circumvent moderation, rate limits, or security controls.</li>
              <li>Upload malicious code or attempt to compromise other users' accounts.</li>
              <li>Use the Service to harass, defame, or violate the rights of others.</li>
              <li>Submit false reports, spam, or manipulated engagement.</li>
              <li>Redistribute or rebroadcast Service content outside the app without permission.</li>
            </ul>
          </Section>

          <Section id="user-submissions" title="5. User Submissions">
            <p>
              When you report content, suggest channels, or submit other feedback,
              you grant Heartify a worldwide, non-exclusive, royalty-free licence
              to use, store, and process that submission for the purpose of
              operating, improving, and moderating the Service. You represent that
              you have the right to submit any content you provide.
            </p>
          </Section>

          <Section id="ip" title="6. Intellectual Property">
            <p>
              The Heartify name, logo, interface, code, and curated organisation
              of content are our property or licensed to us. You are granted a
              limited, revocable, non-transferable licence to use the Service for
              personal, non-commercial purposes. All third-party trademarks
              remain the property of their respective owners.
            </p>
          </Section>

          <Section id="premium" title="7. Premium Features">
            <p>
              Certain features may be offered as Premium. Where Premium is
              provided free of charge, we may modify or discontinue it at any
              time. Where Premium is offered as a paid subscription, terms of
              billing, renewal, cancellation, and refunds will be disclosed at
              the point of purchase and comply with the requirements of the
              applicable app store.
            </p>
          </Section>

          <Section id="third-parties" title="8. Third-Party Services">
            <p>
              The Service integrates with third parties including YouTube, Google,
              Apple, and our infrastructure providers. Your interaction with
              those services is governed by their own terms and privacy policies.
              We are not responsible for third-party content, availability, or
              practices.
            </p>
          </Section>

          <Section id="disclaimer" title="9. Disclaimers">
            <p>
              The Service is provided "as is" and "as available" without warranties
              of any kind, express or implied, including merchantability, fitness
              for a particular purpose, and non-infringement. We do not warrant
              that the Service will be uninterrupted, error-free, or free from
              harmful components, nor that curated content will meet every user's
              standard of halal-appropriateness.
            </p>
          </Section>

          <Section id="liability" title="10. Limitation of Liability">
            <p>
              To the fullest extent permitted by law, Heartify and its officers,
              employees, and affiliates will not be liable for indirect,
              incidental, special, consequential, or punitive damages, or for
              any loss of profits, data, or goodwill, arising from your use of
              the Service. Our total aggregate liability for any claim arising
              out of these Terms or the Service will not exceed the greater of
              (a) the amount you paid us in the 12 months before the claim, or
              (b) USD 50.
            </p>
          </Section>

          <Section id="indemnity" title="11. Indemnification">
            <p>
              You agree to indemnify and hold Heartify harmless from claims,
              damages, and expenses (including reasonable legal fees) arising
              out of your breach of these Terms, misuse of the Service, or
              violation of any third-party right.
            </p>
          </Section>

          <Section id="termination" title="12. Suspension & Termination">
            <p>
              We may suspend or terminate your access at any time for violations
              of these Terms or for legal, security, or operational reasons.
              You may stop using and delete your account at any time. Provisions
              that by their nature should survive termination (including
              intellectual-property, disclaimers, liability limits, and
              governing-law clauses) will survive.
            </p>
          </Section>

          <Section id="changes" title="13. Changes to the Terms">
            <p>
              We may update these Terms from time to time. Material changes will
              be signalled inside the app or by email. Continued use of the
              Service after changes take effect constitutes acceptance of the
              revised Terms.
            </p>
          </Section>

          <Section id="governing-law" title="14. Governing Law & Disputes">
            <p>
              These Terms are governed by the laws of the jurisdiction in which
              Heartify is established, without regard to conflict-of-laws
              principles. You agree to resolve any dispute first through good-faith
              informal negotiation with our team; unresolved disputes will be
              submitted to the exclusive jurisdiction of the courts of that
              jurisdiction, except where local consumer-protection law grants
              you the right to bring proceedings elsewhere.
            </p>
          </Section>

          <Section id="apple" title="15. Apple App Store Additional Terms">
            <p>
              If you obtained the app from the Apple App Store, Apple is not a
              party to these Terms, has no obligation to provide maintenance or
              support, and is not responsible for any product claims. Apple and
              its subsidiaries are third-party beneficiaries of these Terms and
              may enforce them against you.
            </p>
          </Section>

          <Section id="contact" title="16. Contact">
            <p>
              For questions about these Terms, contact us at{" "}
              <a href="mailto:legal@heartify.app" className="underline hover:text-foreground">
                legal@heartify.app
              </a>.
            </p>
          </Section>

          <section className="border-t border-border pt-6">
            <p className="text-xs text-muted-foreground">
              These Terms are provided for informational purposes only and do not
              constitute legal advice. Heartify may adapt this document to
              reflect the specific legal requirements of the jurisdictions in
              which it operates.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
