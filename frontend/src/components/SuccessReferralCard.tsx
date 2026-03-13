'use client';

import { useState, useEffect } from 'react';
import { Gift, CheckCircle2 } from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
const SHARE_PAYLOAD =
  `היי! 👋 אני מתכונן/ת לפסיכומטרי עם Mila – ממש שווה לנסות! 🧠✨\n` +
  `המערכת יודעת בדיוק מה צריך לחזור ומתי, ורואים תוצאות מהר.\n\n` +
  `הצטרף/י דרך הקישור שלי – שנינו מקבלים בונוס XP ענק! 🎁`;

// ── Props ──────────────────────────────────────────────────────────────────────
interface SuccessReferralCardProps {
  referralLink: string;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function SuccessReferralCard({ referralLink }: SuccessReferralCardProps) {
  // Avoid hydration mismatch: detect share API only on the client
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    setCanShare(
      typeof navigator !== 'undefined' &&
      typeof (navigator as Navigator & { share?: unknown }).share === 'function',
    );
  }, []);

  const handleShare = async () => {
    // --- Primary: Web Share API (mobile / PWA) ---
    if (canShare) {
      try {
        await navigator.share({
          title: 'Mila – אפליקציית הפסיכומטרי',
          text: SHARE_PAYLOAD,
          url: referralLink,
        });
      } catch {
        // User dismissed the sheet — no feedback needed
      }
      return;
    }

    // --- Fallback: clipboard copy ---
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      // Clipboard blocked (rare); silently bail
      return;
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      dir="rtl"
      className="
        relative overflow-hidden
        rounded-2xl border border-violet-200/60
        bg-gradient-to-l from-violet-50/70 via-white to-indigo-50/60
        px-4 py-3.5
        shadow-sm
      "
    >
      {/* Decorative background glow — purely cosmetic */}
      <div
        aria-hidden
        className="
          pointer-events-none absolute -top-6 -left-6
          h-24 w-24 rounded-full
          bg-violet-300/20 blur-2xl
        "
      />

      <div className="relative flex items-center gap-3">

        {/* Icon */}
        <div
          className="
            shrink-0
            flex h-9 w-9 items-center justify-center
            rounded-xl
            bg-gradient-to-br from-amber-400 to-orange-400
            shadow-md shadow-amber-300/40
          "
        >
          <Gift className="h-4 w-4 text-white" strokeWidth={2.2} />
        </div>

        {/* Copy block */}
        <div className="flex-1 min-w-0 leading-tight">
          <p className="text-[12.5px] font-black text-gray-900 leading-snug">
            שתף חבר — שניכם מקבלים בונוס XP 🎁
          </p>
          <p className="mt-0.5 text-[10.5px] font-medium text-gray-400 leading-snug">
            שלח את הקישור האישי שלך וקבלו שניכם ביחד
          </p>
        </div>

        {/* CTA button */}
        <button
          onClick={handleShare}
          aria-label={copied ? 'הקישור הועתק' : 'שתף את Mila עם חבר'}
          className="
            shrink-0
            flex items-center gap-1.5
            rounded-xl px-3 py-2
            text-[11px] font-black
            transition-all duration-200
            active:scale-95
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
            "
          style={{
            background: copied
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            boxShadow: copied
              ? '0 4px 12px rgba(16,185,129,0.35)'
              : '0 4px 12px rgba(124,58,237,0.35)',
            color: '#fff',
          }}
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
              הועתק!
            </>
          ) : (
            <>
              <Gift className="h-3.5 w-3.5" strokeWidth={2.2} />
              שתף ←
            </>
          )}
        </button>

      </div>
    </div>
  );
}
