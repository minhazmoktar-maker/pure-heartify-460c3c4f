import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import CookiePreferencesPanel from "@/components/CookiePreferencesPanel";


const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24">
    <h2 className="font-heading text-heading font-bold text-foreground">{title}</h2>
    <div className="mt-3 space-y-3 text-muted-foreground">{children}</div>
  </section>
);

const Privacy = () => {
  const lastUpdated = "July 8, 2026";
  const effective = "July 8, 2026";

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Privacy Policy — Heartify"
        description="How Heartify collects, uses, and protects your personal information."
        path="/privacy"
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
          <h1 className="font-heading text-title font-bold text-foreground md:text-display">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective date: {effective} · Last updated: {lastUpdated}
          </p>
          <p className="mt-4 text-sm text-foreground/90">
            This Privacy Policy explains how Heartify ("Heartify", "we", "us", or
            "our") collects, uses, discloses, and safeguards information when you
            access or use our website, mobile applications, and related services
            (collectively, the "Service"). It also describes the rights and choices
            available to you regarding your personal information. By using the
            Service, you acknowledge that you have read and understood this Policy.
          </p>
        </header>

        <div className="mt-10 space-y-10 text-sm leading-relaxed">
          <Section id="introduction" title="1. Introduction">
            <p>
              Heartify is an AI-assisted content curation platform that helps users
              discover YouTube videos and channels aligned with a family-friendly,
              ethically conscious viewing experience. We take privacy, security, and
              user trust seriously, and we are committed to processing personal data
              lawfully, fairly, and transparently.
            </p>
            <p>
              This Policy applies to all users of the Service worldwide. Where local
              laws grant additional rights (including but not limited to the EU/UK
              General Data Protection Regulation ("GDPR"), the California Consumer
              Privacy Act as amended by the CPRA ("CCPA/CPRA"), and similar
              frameworks), those rights apply in addition to what is described here.
            </p>
          </Section>

          <Section id="definitions" title="2. Definitions">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">"Personal Data"</strong> means any
                information relating to an identified or identifiable natural person.
              </li>
              <li>
                <strong className="text-foreground">"Processing"</strong> means any
                operation performed on Personal Data, whether or not by automated
                means.
              </li>
              <li>
                <strong className="text-foreground">"Service"</strong> means the
                Heartify website, mobile applications, APIs, and related features.
              </li>
              <li>
                <strong className="text-foreground">"User"</strong> means any
                individual who accesses or uses the Service.
              </li>
              <li>
                <strong className="text-foreground">"Third-Party Services"</strong>{" "}
                means external providers whose products or infrastructure are used to
                operate the Service.
              </li>
            </ul>
          </Section>

          <Section id="information-we-collect" title="3. Information We Collect">
            <p>
              We collect information in three broad categories: information you
              provide directly, information collected automatically as you use the
              Service, and information received from Third-Party Services.
            </p>

            <h3 className="mt-4 font-semibold text-foreground">3.1 Information You Provide</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Account information:</strong>{" "}
                email address, display name, and password (stored only as a secure
                cryptographic hash).
              </li>
              <li>
                <strong className="text-foreground">Optional profile information:</strong>{" "}
                avatar, language preference, content interests, and topic selections.
              </li>
              <li>
                <strong className="text-foreground">User-generated content:</strong>{" "}
                favorites, watch history, search queries, feedback, and reports
                submitted to our moderation team.
              </li>
              <li>
                <strong className="text-foreground">Communications:</strong> messages
                you send to our support or privacy channels.
              </li>
            </ul>

            <h3 className="mt-4 font-semibold text-foreground">3.2 Information Collected Automatically</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Device information:</strong>{" "}
                device type, operating system, browser type and version, screen
                dimensions, and language settings.
              </li>
              <li>
                <strong className="text-foreground">Log information:</strong> IP
                address, access times, referral URLs, pages viewed, and interactions
                with the Service, retained for security and diagnostic purposes.
              </li>
              <li>
                <strong className="text-foreground">Approximate location:</strong>{" "}
                country- or region-level location derived from IP address. We do not
                collect precise geolocation.
              </li>
              <li>
                <strong className="text-foreground">Cookies and local storage:</strong>{" "}
                see Section 9 for details.
              </li>
            </ul>

            <h3 className="mt-4 font-semibold text-foreground">3.3 Authentication Data</h3>
            <p>
              When you sign in using a third-party identity provider (such as Google
              or Apple), we receive limited authentication data—typically a unique
              user identifier, email address, and, where you consent, a display name
              and avatar. We do not receive your password from these providers.
            </p>
          </Section>

          <Section id="how-we-use" title="4. How We Use Information">
            <ul className="list-disc space-y-1 pl-5">
              <li>Provide, maintain, and improve the Service.</li>
              <li>Authenticate users and secure accounts.</li>
              <li>Personalize content recommendations and curated sections.</li>
              <li>Operate our AI-assisted content classification systems.</li>
              <li>Detect, prevent, and respond to fraud, abuse, and security incidents.</li>
              <li>Communicate service-related notices, updates, and administrative messages.</li>
              <li>Comply with legal obligations and enforce our Terms of Service.</li>
              <li>Conduct internal analytics to understand and improve product quality.</li>
            </ul>
          </Section>

          <Section id="legal-basis" title="5. Legal Basis for Processing (GDPR)">
            <p>
              If you are located in the European Economic Area, the United Kingdom,
              or another jurisdiction with equivalent requirements, we rely on the
              following legal bases to process Personal Data:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Contract:</strong> to provide the
                Service you request and to fulfill our obligations to you.
              </li>
              <li>
                <strong className="text-foreground">Legitimate interests:</strong> to
                secure the Service, improve product quality, and prevent abuse,
                provided such interests are not overridden by your rights.
              </li>
              <li>
                <strong className="text-foreground">Consent:</strong> where required,
                such as for optional features or certain communications. You may
                withdraw consent at any time.
              </li>
              <li>
                <strong className="text-foreground">Legal obligation:</strong> to
                comply with applicable law or lawful requests.
              </li>
            </ul>
          </Section>

          <section
            id="ai-disclaimer"
            className="scroll-mt-24 rounded-card border border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--gold)/0.05)] p-5"
          >
            <h2 className="font-heading text-heading font-bold text-foreground">
              6. AI Content Classification & Religious Disclaimer
            </h2>
            <div className="mt-3 space-y-3 text-muted-foreground">
              <p>
                Heartify uses automated systems, including machine learning models
                and rule-based heuristics, to analyze publicly available metadata
                (such as video titles, descriptions, and channel information) in
                order to assist with categorization and content moderation. Any
                score, label, or recommendation displayed on the Service is generated
                on a best-effort basis and is provided for informational purposes
                only.
              </p>
              <p>
                <strong className="text-foreground">No guarantee of accuracy.</strong>{" "}
                Automated classification is inherently imperfect and may produce
                errors, false positives, or false negatives. We do not warrant that
                any content displayed on the Service is free from objectionable
                material or otherwise suitable for any particular purpose.
              </p>
              <p>
                <strong className="text-foreground">Not a religious authority.</strong>{" "}
                Heartify is a technology platform and is not a mufti, scholar, or
                religious institution. Nothing on the Service constitutes a fatwa, a
                religious ruling, or an authoritative determination of halal or
                haram status. Users seeking religious guidance should consult
                qualified scholars.
              </p>
              <p>
                <strong className="text-foreground">User responsibility.</strong>{" "}
                You are solely responsible for the content you choose to view and
                for any decisions you make based on information provided by the
                Service. We encourage users to report content they believe has been
                misclassified so we can continue improving our systems.
              </p>
            </div>
          </section>

          <Section id="data-sharing" title="7. Data Sharing">
            <p>We do not sell your Personal Data, and we do not share it with advertisers. We may share information only in the following circumstances:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Service providers:</strong>{" "}
                trusted vendors that process data on our behalf under contractual
                confidentiality and security obligations (e.g., hosting, database,
                authentication, email delivery, error monitoring).
              </li>
              <li>
                <strong className="text-foreground">Legal obligations:</strong> when
                required by applicable law, court order, or valid legal process.
              </li>
              <li>
                <strong className="text-foreground">Safety and enforcement:</strong>{" "}
                to protect the rights, property, or safety of Heartify, our users,
                or the public, and to enforce our Terms of Service.
              </li>
              <li>
                <strong className="text-foreground">Business transfers:</strong> in
                connection with a merger, acquisition, financing, or sale of assets,
                subject to appropriate confidentiality safeguards.
              </li>
              <li>
                <strong className="text-foreground">With your consent:</strong> in
                any other case where you have provided informed consent.
              </li>
            </ul>
          </Section>

          <Section id="third-parties" title="8. Third-Party Services">
            <p>
              The Service integrates with third-party providers to deliver core
              functionality. These providers may include, without limitation:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">YouTube Data API:</strong> used to
                retrieve public video metadata. Your use of embedded YouTube content
                is also governed by the{" "}
                <a
                  href="https://www.youtube.com/t/terms"
                  className="text-foreground underline hover:no-underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  YouTube Terms of Service
                </a>{" "}
                and the{" "}
                <a
                  href="https://policies.google.com/privacy"
                  className="text-foreground underline hover:no-underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong className="text-foreground">Google Sign-In / Apple Sign-In:</strong>{" "}
                optional authentication providers subject to their own privacy
                policies.
              </li>
              <li>
                <strong className="text-foreground">Cloud hosting and databases:</strong>{" "}
                infrastructure providers that store and process data on our behalf.
              </li>
              <li>
                <strong className="text-foreground">Content delivery networks (CDN):</strong>{" "}
                to serve static assets and improve performance.
              </li>
              <li>
                <strong className="text-foreground">Error logging and analytics:</strong>{" "}
                to diagnose issues and improve reliability.
              </li>
              <li>
                <strong className="text-foreground">Email and notification providers:</strong>{" "}
                to deliver transactional and account-related messages.
              </li>
            </ul>
            <p>
              Each Third-Party Service has its own privacy practices, and we
              encourage you to review them.
            </p>
          </Section>

          <Section id="cookies" title="9. Cookies & Similar Technologies">
            <p>We use a limited set of cookies and browser storage mechanisms:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Essential cookies:</strong>{" "}
                required to operate the Service, load pages, and maintain security.
              </li>
              <li>
                <strong className="text-foreground">Authentication cookies:</strong>{" "}
                keep you signed in across sessions.
              </li>
              <li>
                <strong className="text-foreground">Preference storage:</strong>{" "}
                remembers your theme, language, and interface settings.
              </li>
              <li>
                <strong className="text-foreground">Functional storage:</strong>{" "}
                supports features such as recent searches and playback state.
              </li>
            </ul>
            <p>
              We do not currently use advertising cookies or third-party marketing
              trackers. If this ever changes, we will update this Policy and, where
              required, request your consent.
            </p>
          </Section>

          <Section id="retention" title="10. Data Retention">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Active accounts:</strong> we
                retain Personal Data for as long as your account is active or as
                needed to provide the Service.
              </li>
              <li>
                <strong className="text-foreground">Account deletion:</strong> upon
                deletion, we remove or de-identify Personal Data within a reasonable
                period, typically within 30 days, subject to technical constraints.
              </li>
              <li>
                <strong className="text-foreground">Backups:</strong> residual copies
                may persist in encrypted backups for a limited period (typically no
                more than 90 days) before being overwritten.
              </li>
              <li>
                <strong className="text-foreground">Legal retention:</strong> certain
                information may be retained longer where required by law, to resolve
                disputes, or to enforce our agreements.
              </li>
            </ul>
          </Section>

          <Section id="security" title="11. Data Security">
            <p>
              We implement administrative, technical, and organizational safeguards
              designed to protect Personal Data against unauthorized access,
              alteration, disclosure, or destruction. Measures we apply, where
              implemented, include:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Encryption of data in transit using HTTPS/TLS.</li>
              <li>Encryption of data at rest for supported storage layers.</li>
              <li>Passwords stored using industry-standard cryptographic hashing.</li>
              <li>OAuth-based authentication for third-party sign-in flows.</li>
              <li>Session expiration, secure and httpOnly cookies, and CSRF protection where applicable.</li>
              <li>Rate limiting and abuse-detection controls on sensitive endpoints.</li>
              <li>Row-Level Security (RLS) enforced at the database layer.</li>
              <li>Principle of least privilege for internal access to systems and data.</li>
              <li>Audit logging of administrative and moderation actions.</li>
              <li>Secure secret management for API keys and credentials.</li>
              <li>Regular security reviews and dependency monitoring.</li>
            </ul>
            <p>
              No method of transmission or storage is 100% secure. While we work to
              protect your information, we cannot guarantee absolute security.
            </p>
          </Section>

          <Section id="international" title="12. International Data Transfers">
            <p>
              Heartify operates globally, and your information may be processed in
              countries other than your own. Where required, we rely on appropriate
              safeguards for international transfers, such as Standard Contractual
              Clauses or equivalent mechanisms.
            </p>
          </Section>

          <Section id="children" title="13. Children's Privacy">
            <p>
              The Service is not directed to children under the age required by
              applicable law (for example, 13 in the United States, 16 in parts of
              the European Economic Area, or the equivalent minimum age in your
              jurisdiction). We do not knowingly collect Personal Data from children
              without appropriate parental or guardian consent. If you believe a
              child has provided us with Personal Data without such consent, please
              contact us and we will take reasonable steps to delete it.
            </p>
          </Section>

          <Section id="rights" title="14. Your Rights and Choices">
            <p>
              Subject to applicable law, you may exercise the following rights in
              relation to your Personal Data:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Access:</strong> obtain a copy of
                the Personal Data we hold about you.
              </li>
              <li>
                <strong className="text-foreground">Rectification:</strong> request
                correction of inaccurate or incomplete data.
              </li>
              <li>
                <strong className="text-foreground">Deletion:</strong> request
                deletion of your account and associated Personal Data.
              </li>
              <li>
                <strong className="text-foreground">Portability:</strong> receive
                your data in a structured, commonly used, machine-readable format.
              </li>
              <li>
                <strong className="text-foreground">Restriction and objection:</strong>{" "}
                request that we restrict or object to certain processing activities.
              </li>
              <li>
                <strong className="text-foreground">Withdraw consent:</strong> where
                processing is based on consent, you may withdraw it at any time.
              </li>
              <li>
                <strong className="text-foreground">Lodge a complaint:</strong> with
                your local data protection authority.
              </li>
            </ul>
            <p>
              To exercise these rights, contact us using the details in Section 19.
              We may need to verify your identity before responding.
            </p>
          </Section>

          <Section id="account-deletion" title="15. Account Deletion Process">
            <p>
              You may request account deletion at any time from your profile
              settings or by contacting our privacy team. Upon verified request, we
              will deactivate your account and delete or de-identify associated
              Personal Data within a reasonable timeframe, except where retention is
              required to comply with legal obligations, resolve disputes, or
              enforce our agreements. Residual copies in encrypted backups will be
              purged in the normal backup rotation cycle.
            </p>
          </Section>

          <Section id="communications" title="16. Marketing & Communications">
            <p>
              We send transactional and service-related messages that are necessary
              to operate the Service (for example, security alerts, password resets,
              and material policy changes). Any non-essential marketing
              communications are opt-in, and you can unsubscribe at any time using
              the link provided in such messages or through your account settings.
            </p>
          </Section>

          <Section id="analytics" title="17. Platform Analytics">
            <p>
              We use privacy-conscious internal analytics to understand aggregate
              usage patterns, monitor reliability, and improve product quality. We
              do not sell analytics data, and we do not share it with third-party
              advertising networks.
            </p>
          </Section>

          <Section id="incident-response" title="18. Security Incident Response">
            <p>
              We maintain procedures to detect, investigate, and respond to
              suspected security incidents. In the event of a data breach that is
              likely to result in a risk to your rights and freedoms, we will
              notify affected users and applicable regulators without undue delay,
              in accordance with applicable law.
            </p>
          </Section>

          <Section id="updates" title="19. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time to reflect changes
              in our practices, technology, legal requirements, or other factors.
              When we make material changes, we will notify users through the
              Service or by other reasonable means and update the "Last updated"
              date above. Your continued use of the Service after such changes
              constitutes acceptance of the revised Policy.
            </p>
          </Section>

          <Section id="contact" title="20. Contact Information">
            <p>
              If you have questions, concerns, or requests regarding this Privacy
              Policy or your Personal Data, please contact us at:
            </p>
            <p className="text-foreground">
              <strong>Email:</strong> privacy@heartify.app
            </p>
            <p>
              We will respond to legitimate requests within the timeframes required
              by applicable law.
            </p>
          </Section>

          <section className="border-t border-border pt-6">
            <p className="text-micro text-muted-foreground">
              This Privacy Policy is provided for informational purposes and does
              not constitute legal advice. Heartify may adapt this document to
              reflect the specific legal requirements of the jurisdictions in which
              it operates.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
