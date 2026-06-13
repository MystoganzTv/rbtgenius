import PublicPageShell from "@/components/public/PublicPageShell";

export default function EULA() {
  return (
    <PublicPageShell
      title="End User License Agreement (EULA)"
      description="This End User License Agreement is a legal agreement between you and RBT Genius governing your use of the RBT Genius mobile application, website, and related services."
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Last Updated: June 2026
      </p>

      <p>
        This End User License Agreement (&quot;Agreement&quot;) is a legal agreement between you
        (&quot;User&quot;, &quot;you&quot;, or &quot;your&quot;) and RBT Genius (&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, or
        &quot;us&quot;) governing your use of the RBT Genius mobile application, website, and related
        services (collectively, the &quot;Services&quot;).
      </p>
      <p>
        By downloading, installing, accessing, or using RBT Genius, you agree to be bound by this
        Agreement.
      </p>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">1. License Grant</h2>
        <p className="mt-3">
          RBT Genius grants you a limited, non-exclusive, non-transferable, revocable license to use
          the Services for your personal, non-commercial educational purposes in accordance with this
          Agreement.
        </p>
        <p className="mt-3">You may not:</p>
        <ul className="mt-3 list-disc space-y-2 pl-6">
          <li>Copy, modify, distribute, sell, lease, or sublicense any part of the Services.</li>
          <li>
            Reverse engineer, decompile, or attempt to extract source code except where permitted by
            applicable law.
          </li>
          <li>Use the Services for unlawful purposes.</li>
          <li>Share your account credentials with others.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">2. User Accounts</h2>
        <p className="mt-3">
          Certain features require an account. You are responsible for maintaining the
          confidentiality of your login credentials and for all activity that occurs under your
          account.
        </p>
        <p className="mt-3">
          You may create an account using email and password, Sign in with Apple, or other supported
          authentication providers.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          3. Subscriptions and Payments
        </h2>
        <p className="mt-3">
          RBT Genius offers optional auto-renewable subscriptions, including monthly and yearly plans
          that provide access to premium features.
        </p>
        <p className="mt-3">
          Subscriptions are managed by Apple through your App Store account and automatically renew
          unless canceled at least 24 hours before the end of the current billing period.
        </p>
        <p className="mt-3">
          Payment will be charged to your Apple ID account at confirmation of purchase.
        </p>
        <p className="mt-3">
          You can manage or cancel your subscription at any time through your Apple App Store account
          settings.
        </p>
        <p className="mt-3">
          Any unused portion of a free trial, if offered, will be forfeited when you purchase a
          subscription.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          4. Educational Disclaimer
        </h2>
        <p className="mt-3">
          RBT Genius provides educational materials, practice questions, analytics, and study tools
          designed to assist users preparing for the Registered Behavior Technician (RBT)
          examination.
        </p>
        <p className="mt-3">
          RBT Genius does not guarantee passing any certification examination, obtaining employment,
          or achieving specific results.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          5. Intellectual Property
        </h2>
        <p className="mt-3">
          All content included within RBT Genius, including but not limited to questions,
          explanations, designs, graphics, logos, software, and educational materials, is owned by
          RBT Genius or its licensors and protected by applicable intellectual property laws.
        </p>
        <p className="mt-3">
          You may not reproduce, redistribute, or commercially exploit any content without prior
          written permission.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          6. Account Termination and Deletion
        </h2>
        <p className="mt-3">
          Users may permanently delete their account at any time through the application.
        </p>
        <p className="mt-3">
          When an account deletion request is confirmed, personal data associated with the account
          will be permanently deleted according to our Privacy Policy, except where retention is
          required by applicable law.
        </p>
        <p className="mt-3">
          We reserve the right to suspend or terminate accounts that violate this Agreement.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          7. Availability and Changes
        </h2>
        <p className="mt-3">
          We strive to maintain the availability of the Services but do not guarantee uninterrupted
          access.
        </p>
        <p className="mt-3">
          We may modify, update, suspend, or discontinue features of the Services at any time.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          8. Limitation of Liability
        </h2>
        <p className="mt-3">
          To the maximum extent permitted by law, RBT Genius shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages resulting from the use of or
          inability to use the Services.
        </p>
        <p className="mt-3">
          Our total liability shall not exceed the amount paid by the user to RBT Genius during the
          twelve (12) months preceding the claim.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">9. Governing Law</h2>
        <p className="mt-3">
          This Agreement shall be governed by and interpreted under the laws of the Commonwealth of
          Virginia, United States, without regard to conflict of law principles.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          10. Contact Information
        </h2>
        <p className="mt-3">
          For questions regarding this EULA or the Services, please contact us at:
        </p>
        <p className="mt-3">
          Email:{" "}
          <a className="font-medium text-[#1E5EFF]" href="mailto:support@rbtgenius.com">
            support@rbtgenius.com
          </a>
          <br />
          Website:{" "}
          <a className="font-medium text-[#1E5EFF]" href="https://www.rbtgenius.com">
            https://www.rbtgenius.com
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          11. Changes to This Agreement
        </h2>
        <p className="mt-3">
          We may update this EULA from time to time. The updated version will be published at:{" "}
          <a className="font-medium text-[#1E5EFF]" href="https://www.rbtgenius.com/eula">
            https://www.rbtgenius.com/eula
          </a>
          .
        </p>
        <p className="mt-3">
          Your continued use of RBT Genius after changes become effective constitutes your acceptance
          of the revised Agreement.
        </p>
      </section>
    </PublicPageShell>
  );
}
