// CTA link field shared by the setup wizard and the advanced editor: either a
// custom http(s) URL (the original behaviour) or one of the owner's booking
// pages, stored as the same-site path "/book/{slug}" in ctaUrl.
import { useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { bookingPagePath } from "@shared/webinarFunnel";

export type BookingPageOption = { id: string; slug: string; title: string };

type Props = {
  value: string;
  onChange: (v: string) => void;
  className: string;
  style: CSSProperties;
  placeholder: string;
};

export function CtaLinkInput({ value, onChange, className, style, placeholder }: Props) {
  const { data } = useQuery<BookingPageOption[] | null>({ queryKey: ["/api/meeting-types"] });
  const pages = data ?? [];
  const [picked, setPicked] = useState<"custom" | "booking" | null>(null);
  const isBookingPath = value.trim().startsWith("/book/");
  const mode = pages.length === 0 ? "custom" : picked ?? (isBookingPath ? "booking" : "custom");

  const urlInput = (
    <input data-testid="input-cta-url" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} className={className} style={style} />
  );
  // No booking pages on this account: exactly the plain URL field as before.
  if (pages.length === 0) return urlInput;

  const selectStyle: CSSProperties = { ...style, colorScheme: "dark" };
  const currentSlug = isBookingPath ? value.trim().slice("/book/".length) : "";
  const known = pages.some(p => p.slug === currentSlug);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-[11px] text-zinc-500">
        <span className="whitespace-nowrap">Link the offer button to…</span>
        <select data-testid="select-cta-target" value={mode}
          onChange={e => {
            const next = e.target.value as "custom" | "booking";
            setPicked(next);
            if (next === "custom" && isBookingPath) onChange("");
            if (next === "booking" && !isBookingPath) onChange("");
          }}
          className="flex-1 px-2 py-1 rounded-lg text-[12px] text-white" style={selectStyle}>
          <option value="custom">Custom URL</option>
          <option value="booking">Booking page</option>
        </select>
      </label>
      {mode === "custom" ? urlInput : (
        <select data-testid="select-cta-booking-page" value={currentSlug} onChange={e => onChange(e.target.value ? bookingPagePath(e.target.value) : "")}
          className={className} style={selectStyle}>
          <option value="">Choose a booking page…</option>
          {pages.map(p => <option key={p.id} value={p.slug}>{p.title} — /book/{p.slug}</option>)}
          {currentSlug && !known && <option value={currentSlug}>/book/{currentSlug} (not available)</option>}
        </select>
      )}
    </div>
  );
}
