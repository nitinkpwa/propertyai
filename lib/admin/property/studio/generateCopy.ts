import "server-only";
import { getOpenAIClient, isOpenAIConfigured, OPENAI_MODEL } from "@/lib/ask/openai-client";
import type { AdminPropertyFormState } from "../types";
import type { GenerateAction, GenerateResult } from "./types";

const ACTION_TITLES: Record<GenerateAction, string> = {
  improve_description: "Improved Description",
  rewrite_seo: "SEO Rewrite",
  whatsapp_ad: "WhatsApp Ad",
  facebook_ad: "Facebook Ad",
  google_ad: "Google Ad",
  social_caption: "Social Caption",
  reel_script: "Reel Script",
  video_narration: "Video Narration",
};

function factsBlock(form: AdminPropertyFormState): string {
  return [
    `Title: ${form.title}`,
    `Builder: ${form.builder_name || form.basic.builder}`,
    `Project: ${form.basic.project}`,
    `Config: ${form.basic.configuration}`,
    `Type: ${form.sub_type} / ${form.type}`,
    `Price: ${form.price || form.pricing.currentPrice}`,
    `PPSF: ${form.pricing.pricePerSqft}`,
    `Location: ${form.location}, ${form.city}`,
    `Possession: ${form.possession}`,
    `RERA: ${form.rera_number}`,
    `Amenities: ${form.amenities.join(", ")}`,
    `Payment: ${form.pricing.paymentPlan}`,
  ].join("\n");
}

function templateGenerate(action: GenerateAction, form: AdminPropertyFormState): string {
  const title = form.title || "this project";
  const loc = form.location || form.city;
  const price = form.price || form.pricing.currentPrice;
  const priceLabel = price
    ? `₹${Number(price).toLocaleString("en-IN")}`
    : form.pricing.currentPrice || "Price on request";
  const config = form.basic.configuration || form.sub_type;
  const builder = form.builder_name || form.basic.builder || "the developer";
  const possession = form.possession || "as per RERA";

  switch (action) {
    case "improve_description":
      return `${title} is a ${config} offering in ${loc} by ${builder}. ${
        price ? `Listed at ${priceLabel}.` : ""
      } ${form.rera_number ? `RERA: ${form.rera_number}.` : ""} Possession: ${possession}. Amenities include ${
        form.amenities.slice(0, 6).join(", ") || "project facilities"
      }. Ideal for buyers seeking verified inventory with clear facts — confirm pricing and site visit via AreaIQ.`;
    case "rewrite_seo":
      return [
        `Meta title: ${title} ${config ? `| ${config}` : ""} in ${form.city} | AreaIQ`,
        `Meta description: Explore ${title} by ${builder} in ${loc}. ${config}. ${priceLabel}. Possession ${possession}. AI-verified facts on AreaIQ.`,
        `Keywords: ${form.seo.slug || title}, ${form.city}, ${builder}, ${config}, AreaIQ`,
      ].join("\n");
    case "whatsapp_ad":
      return `🏡 *${title}*\n📍 ${loc}\n🛋 ${config}\n💰 ${priceLabel}\n📅 Possession: ${possession}\n${
        form.rera_number ? `✅ RERA ${form.rera_number}\n` : ""
      }\nReply *SITE VISIT* for a guided tour.\n— AreaIQ AI Property Intelligence`;
    case "facebook_ad":
      return `Discover ${title} in ${loc}. ${config} by ${builder}. Starting ${priceLabel}. Possession ${possession}. Get AI insights, locality scores, and book a site visit on AreaIQ.`;
    case "google_ad":
      return [
        `Headline: ${title} in ${form.city}`,
        `Headline 2: ${config} from ${priceLabel}`,
        `Description: Verified facts, RERA checks & site visits. Explore on AreaIQ.`,
      ].join("\n");
    case "social_caption":
      return `${title} · ${loc} · ${config} · ${priceLabel}. Smart buyers start with AreaIQ intelligence. #AreaIQ #${form.city.replace(/\s/g, "")}RealEstate`;
    case "reel_script":
      return `[Hook 0-3s] "${title} — is this the smartest buy in ${form.city}?"\n[3-10s] Show facade + price ${priceLabel}\n[10-20s] Location pin ${loc}, airport/connectivity\n[20-35s] Amenities: ${form.amenities.slice(0, 4).join(", ") || "club & lifestyle"}\n[35-45s] CTA: Book site visit on AreaIQ`;
    case "video_narration":
      return `Welcome to ${title}, a ${config} development by ${builder} in ${loc}. Priced at ${priceLabel} with possession targeted for ${possession}. ${
        form.rera_number ? `The project carries RERA registration ${form.rera_number}. ` : ""
      }Explore AI-backed locality insights and schedule your visit with AreaIQ.`;
    default:
      return "";
  }
}

export async function generateMarketingCopy(
  action: GenerateAction,
  form: AdminPropertyFormState,
): Promise<GenerateResult> {
  const title = ACTION_TITLES[action];

  if (!isOpenAIConfigured()) {
    return { action, title, content: templateGenerate(action, form) };
  }

  try {
    const client = getOpenAIClient();
    const prompts: Record<GenerateAction, string> = {
      improve_description: "Write an improved professional property listing description (120-180 words). Use only provided facts.",
      rewrite_seo: "Rewrite SEO meta title, meta description, and keywords. Format as labeled lines.",
      whatsapp_ad: "Write a concise WhatsApp marketing message with light formatting (*bold*). Indian real estate tone.",
      facebook_ad: "Write a Facebook ad primary text (under 125 words) with a clear CTA.",
      google_ad: "Write Google RSA-style headlines and description lines.",
      social_caption: "Write one short social caption with 3-5 hashtags.",
      reel_script: "Write a 45-second Instagram reel shot list + spoken lines.",
      video_narration: "Write a calm 60-second video narration script.",
    };

    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            "You write marketing copy for AreaIQ, India's AI real estate intelligence platform. Never invent prices, RERA numbers, or amenities not in the facts.",
        },
        {
          role: "user",
          content: `${prompts[action]}\n\nFacts:\n${factsBlock(form)}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim() || templateGenerate(action, form);
    return { action, title, content };
  } catch (err) {
    console.error("generateMarketingCopy fallback:", err);
    return { action, title, content: templateGenerate(action, form) };
  }
}
