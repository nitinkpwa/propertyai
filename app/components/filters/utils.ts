import { formatInrAmount } from "@/lib/properties/pricingDisplay";

export function formatIndianPrice(value: number): string {
  return formatInrAmount(value);
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
