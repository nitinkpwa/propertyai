"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "@/components/common/Logo";
import {
  CONNECT_FAQ,
  CONNECT_FEATURES,
  CONNECT_PRICING,
  CONNECT_STEPS,
  CONNECT_TESTIMONIALS,
  CONNECT_WHY,
  EMERALD,
} from "@/lib/connect/constants";
import { fetchConnectLandingStats } from "@/lib/connect/queries";
import type { ConnectLandingStats } from "@/lib/connect/types";

function formatStat(value: number): string {
  return value.toLocaleString("en-IN");
}

export default function ConnectLandingPage() {
  const [stats, setStats] = useState<ConnectLandingStats>({
    propertiesListed: 0,
    builders: 0,
    projects: 0,
    cities: 0,
    monthlyBuyerLeads: 0,
  });
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    fetchConnectLandingStats().then(setStats);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-16">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-neutral-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.08),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 flex justify-center">
              <Logo size="hero" suffix="Connect" showTagline href="/connect" priority />
            </div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Builder & Developer Portal
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
              AreaIQ Connect
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600 sm:text-xl">
              Manage your projects, inventory, channel partners and buyer leads from one
              intelligent platform.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/connect/login"
                className="inline-flex rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-800 shadow-sm transition-all hover:bg-neutral-50"
              >
                Login
              </Link>
              <Link
                href="/connect/register"
                className="inline-flex rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-all hover:shadow-md"
                style={{ backgroundColor: EMERALD }}
              >
                Register as Builder
              </Link>
              <a
                href="mailto:connect@areaiq.app?subject=Book%20a%20Demo"
                className="inline-flex rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100"
              >
                Book Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900">
            Everything builders need
          </h2>
          <p className="mt-3 text-neutral-500">
            A complete B2B toolkit for developers and real estate companies.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {CONNECT_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-50 text-xl transition-colors group-hover:bg-emerald-50">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-neutral-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Why */}
      <section className="border-y border-neutral-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-neutral-900">
                Why AreaIQ Connect
              </h2>
              <p className="mt-4 text-neutral-600">
                Built for builders who want verified demand, operational clarity, and
                scalable partner networks.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {CONNECT_WHY.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
                >
                  <span className="mt-0.5 text-emerald-500">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900">
            Platform at a glance
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            { label: "Properties Listed", value: stats.propertiesListed },
            { label: "Builders", value: stats.builders },
            { label: "Projects", value: stats.projects },
            { label: "Cities", value: stats.cities },
            { label: "Monthly Buyer Leads", value: stats.monthlyBuyerLeads },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-neutral-200 bg-white p-5 text-center shadow-sm"
            >
              <p className="text-2xl font-bold text-neutral-900 sm:text-3xl">
                {formatStat(item.value)}
              </p>
              <p className="mt-2 text-xs font-medium text-neutral-500 sm:text-sm">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-neutral-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-neutral-900">
            How it works
          </h2>
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:justify-between">
            {CONNECT_STEPS.map((step, index) => (
              <div key={step.step} className="flex flex-col items-center text-center md:flex-1">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white shadow-sm"
                  style={{ backgroundColor: EMERALD }}
                >
                  {step.step}
                </div>
                <h3 className="mt-4 font-semibold text-neutral-900">{step.title}</h3>
                <p className="mt-2 max-w-[180px] text-sm text-neutral-500">
                  {step.description}
                </p>
                {index < CONNECT_STEPS.length - 1 ? (
                  <span className="my-2 hidden text-2xl text-emerald-300 md:block md:rotate-0">
                    →
                  </span>
                ) : null}
                {index < CONNECT_STEPS.length - 1 ? (
                  <span className="my-1 text-xl text-emerald-300 md:hidden">↓</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-neutral-900">
          Trusted by developers
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {CONNECT_TESTIMONIALS.map((item) => (
            <blockquote
              key={item.name}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm leading-relaxed text-neutral-600">&ldquo;{item.quote}&rdquo;</p>
              <footer className="mt-4 border-t border-neutral-100 pt-4">
                <p className="font-semibold text-neutral-900">{item.name}</p>
                <p className="text-xs text-neutral-500">{item.role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="border-y border-neutral-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-neutral-900">
            Pricing
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {CONNECT_PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 shadow-sm ${
                  plan.featured
                    ? "border-emerald-200 bg-emerald-50/50 ring-1 ring-emerald-200"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <h3 className="text-lg font-bold text-neutral-900">{plan.name}</h3>
                <p className="mt-2 text-sm text-neutral-500">{plan.description}</p>
                <p className="mt-6 text-2xl font-bold text-emerald-600">{plan.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-neutral-900">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {CONNECT_FAQ.map((item, index) => (
            <div
              key={item.q}
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-neutral-900"
              >
                {item.q}
                <span className="text-neutral-400">{openFaq === index ? "−" : "+"}</span>
              </button>
              {openFaq === index ? (
                <div className="border-t border-neutral-100 px-5 py-4 text-sm leading-relaxed text-neutral-600">
                  {item.a}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-neutral-900 py-12 text-neutral-300">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Logo size="footer" suffix="Connect" variant="dark" showTagline href="/connect" />
              <p className="mt-2 max-w-sm text-sm text-neutral-400">
                The B2B platform for builders, developers, and real estate companies on
                AreaIQ.
              </p>
            </div>
            <div className="flex flex-wrap gap-8 text-sm">
              <div>
                <p className="mb-3 font-semibold text-white">Product</p>
                <ul className="space-y-2">
                  <li><Link href="/connect/login" className="hover:text-white">Login</Link></li>
                  <li><Link href="/connect/register" className="hover:text-white">Register</Link></li>
                  <li><a href="mailto:connect@areaiq.app" className="hover:text-white">Book Demo</a></li>
                </ul>
              </div>
              <div>
                <p className="mb-3 font-semibold text-white">AreaIQ</p>
                <ul className="space-y-2">
                  <li><Link href="/" className="hover:text-white">Home</Link></li>
                  <li><Link href="/properties" className="hover:text-white">Properties</Link></li>
                  <li><Link href="/ask" className="hover:text-white">AI Assistant</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <p className="mt-10 border-t border-neutral-800 pt-6 text-center text-xs text-neutral-500">
            © {new Date().getFullYear()} AreaIQ. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
