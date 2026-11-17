import { Sprout } from 'lucide-react';

export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'contato@climora.app';

export function BrandMark({ size = 25 }: { size?: number }) {
  return <span className="brand-mark"><Sprout size={size} strokeWidth={1.8} /></span>;
}

export function Brand({ subtitle }: { subtitle?: string }) {
  return <div className="brand">
    <BrandMark />
    <span className="brand-text"><span className="brand-name">Climora</span>{subtitle && <span className="brand-sub">{subtitle}</span>}</span>
  </div>;
}

export function PlantingLines() {
  return <svg className="planting-lines" viewBox="0 0 340 210" fill="none" aria-hidden="true"><path d="M80 -30C-70 120 220 55 130 250M110 -30C-40 120 250 55 160 250M140 -30C-10 120 280 55 190 250M170 -30C20 120 310 55 220 250M200 -30C50 120 340 55 250 250M230 -30C80 120 370 55 280 250M260 -30C110 120 400 55 310 250" /></svg>;
}
