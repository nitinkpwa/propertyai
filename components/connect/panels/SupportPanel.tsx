"use client";

import { connectTokens } from "@/lib/connect/design";

export default function SupportPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className={connectTokens.heading}>Support</h2>
        <p className={connectTokens.subheading}>Get help from the AreaIQ partner success team</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`${connectTokens.card} p-6`}>
          <span className="text-2xl">📞</span>
          <h3 className="mt-3 font-bold text-heading-primary">Partner Hotline</h3>
          <p className="mt-1 text-sm text-body">Mon–Sat, 9 AM – 7 PM IST</p>
          <a href="tel:+911800000000" className={`mt-4 inline-block ${connectTokens.btnPrimary}`}>Call Support</a>
        </div>
        <div className={`${connectTokens.card} p-6`}>
          <span className="text-2xl">💬</span>
          <h3 className="mt-3 font-bold text-heading-primary">WhatsApp Support</h3>
          <p className="mt-1 text-sm text-body">Quick responses for urgent lead issues</p>
          <a href="https://wa.me/911800000000" target="_blank" rel="noopener noreferrer" className={`mt-4 inline-block ${connectTokens.btnSecondary}`}>Chat on WhatsApp</a>
        </div>
        <div className={`${connectTokens.card} p-6`}>
          <span className="text-2xl">📧</span>
          <h3 className="mt-3 font-bold text-heading-primary">Email</h3>
          <p className="mt-1 text-sm text-body">For property assignment and account issues</p>
          <a href="mailto:connect@areaiq.in" className={`mt-4 inline-block ${connectTokens.btnSecondary}`}>connect@areaiq.in</a>
        </div>
        <div className={`${connectTokens.card} p-6`}>
          <span className="text-2xl">📚</span>
          <h3 className="mt-3 font-bold text-heading-primary">Partner Guide</h3>
          <p className="mt-1 text-sm text-body">Learn how property-based lead ownership works</p>
          <ul className="mt-3 space-y-1 text-xs text-body">
            <li>· Each property is assigned by AreaIQ Admin</li>
            <li>· Enquiries belong to the property&apos;s partner</li>
            <li>· Buyers are never permanently owned</li>
            <li>· Respond within 2 hours for best results</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
