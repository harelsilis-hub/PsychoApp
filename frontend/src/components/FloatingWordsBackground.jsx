/**
 * FloatingWordsBackground
 *
 * Fixed full-screen dark gradient layer with floating word pairs.
 *
 * KEY DESIGN DECISIONS
 * ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
 * ג€¢ CSS @keyframe on the OUTER wrapper handles diagonal drift.
 * ג€¢ Framer Motion on the INNER span handles the scaleX flip.
 * ג†’ These MUST live on separate elements; both use `transform`,
 *   and FM's inline-style transform would override the CSS keyframe
 *   if applied to the same node.
 *
 * ג€¢ FALLBACK_WORDS is a hardcoded list so animation plays
 *   immediately ג€” even before the API responds or when the user
 *   is not yet authenticated (e.g. login page).
 *
 * ג€¢ Mounted once in App.jsx (outside <Routes>).
 *   Single fetch, animation never resets on navigation.
 */
import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import apiClient from '../api/client';

/* ג”€ג”€ג”€ Inject CSS keyframe once at module load ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ */
const KF_ID = 'fw-bg-drift';
if (typeof document !== 'undefined' && !document.getElementById(KF_ID)) {
  const s = document.createElement('style');
  s.id = KF_ID;
  // Words travel from their start position toward the bottom-left.
  s.textContent = `
    @keyframes fw-drift {
      from { transform: translate(0px, 0px); }
      to   { transform: translate(-130vw, 100vh); }
    }
  `;
  document.head.appendChild(s);
}

/* ג”€ג”€ג”€ Hardcoded fallback ג€” shown immediately, no API needed ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ */
const FALLBACK_WORDS = [
  { english: 'knowledge',    hebrew: '׳™׳“׳¢'          },
  { english: 'memory',       hebrew: '׳–׳™׳›׳¨׳•׳'        },
  { english: 'language',     hebrew: '׳©׳₪׳”'           },
  { english: 'understand',   hebrew: '׳׳”׳‘׳™׳'          },
  { english: 'practice',     hebrew: '׳×׳¨׳’׳•׳'          },
  { english: 'progress',     hebrew: '׳”׳×׳§׳“׳׳•׳×'        },
  { english: 'vocabulary',   hebrew: '׳׳•׳¦׳¨ ׳׳™׳׳™׳'     },
  { english: 'achievement',  hebrew: '׳”׳™׳©׳’'           },
  { english: 'intelligence', hebrew: '׳׳™׳ ׳˜׳׳™׳’׳ ׳¦׳™׳”'     },
  { english: 'challenge',    hebrew: '׳׳×׳’׳¨'           },
  { english: 'success',      hebrew: '׳”׳¦׳׳—׳”'          },
  { english: 'ability',      hebrew: '׳™׳›׳•׳׳×'          },
  { english: 'concept',      hebrew: '׳׳•׳©׳’'           },
  { english: 'analysis',     hebrew: '׳ ׳™׳×׳•׳—'          },
  { english: 'strategy',     hebrew: '׳׳¡׳˜׳¨׳˜׳’׳™׳”'       },
  { english: 'fluency',      hebrew: '׳©׳˜׳£'            },
  { english: 'abstract',     hebrew: '׳׳•׳₪׳©׳˜'          },
  { english: 'complex',      hebrew: '׳׳•׳¨׳›׳‘'          },
  { english: 'evidence',     hebrew: '׳¨׳׳™׳”'           },
  { english: 'theory',       hebrew: '׳×׳™׳׳•׳¨׳™׳”'        },
  { english: 'logical',      hebrew: '׳׳•׳’׳™'           },
  { english: 'structure',    hebrew: '׳׳‘׳ ׳”'           },
  { english: 'pattern',      hebrew: '׳×׳‘׳ ׳™׳×'          },
  { english: 'purpose',      hebrew: '׳׳˜׳¨׳”'           },
  { english: 'context',      hebrew: '׳”׳§׳©׳¨'           },
  { english: 'sequence',     hebrew: '׳¨׳¦׳£'            },
  { english: 'significant',  hebrew: '׳׳©׳׳¢׳•׳×׳™'        },
  { english: 'essential',    hebrew: '׳—׳™׳•׳ ׳™'          },
  { english: 'category',     hebrew: '׳§׳˜׳’׳•׳¨׳™׳”'        },
  { english: 'precise',      hebrew: '׳׳“׳•׳™׳§'          },
  { english: 'resource',     hebrew: '׳׳©׳׳‘'           },
  { english: 'method',       hebrew: '׳©׳™׳˜׳”'           },
  { english: 'relative',     hebrew: '׳™׳—׳¡׳™'           },
  { english: 'system',       hebrew: '׳׳¢׳¨׳›׳×'          },
  { english: 'variety',      hebrew: '׳׳’׳•׳•׳'          },
  { english: 'primary',      hebrew: '׳¨׳׳©׳•׳ ׳™'         },
  { english: 'define',       hebrew: '׳׳”׳’׳“׳™׳¨'          },
  { english: 'thought',      hebrew: '׳׳—׳©׳‘׳”'          },
];

/* ג”€ג”€ג”€ Seeded pseudo-random (stable across re-renders) ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ */
const sr = (seed) => {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
};

/* ג”€ג”€ג”€ Build particle config list from a word array ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ */
const buildParticles = (words) =>
  Array.from({ length: Math.min(38, words.length) }, (_, i) => ({
    id:           i,
    wordPair:     words[i % words.length],
    startX:       15 + sr(i * 13 + 0) * 120,  // 15ג€“135 vw
    startY:      -20 + sr(i * 13 + 1) * 95,   // -20ג€“75 vh
    duration:     30 + sr(i * 13 + 2) * 35,   // 30ג€“65 s
    delay:       -(sr(i * 13 + 3) * 60),       // 0 to -60 s
    fontSize:     10 + sr(i * 13 + 4) * 14,   // 10ג€“24 px
    opacity:      0.12 + sr(i * 13 + 5) * 0.13, // 0.12ג€“0.25
    initialFace:  sr(i * 13 + 6) > 0.5 ? 'en' : 'he',
    firstFlipMs:  sr(i * 13 + 7) * 6000,      // 0ג€“6 s before first flip
  }));

/* ג”€ג”€ג”€ Single word particle ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ */
const WordParticle = ({ wordPair, config }) => {
  const [face, setFace]  = useState(config.initialFace);
  const controls         = useAnimation();
  const cancelRef        = useRef(false);

  useEffect(() => {
    cancelRef.current = false;

    const run = async () => {
      await new Promise((r) => setTimeout(r, config.firstFlipMs));

      while (!cancelRef.current) {
        const wait = 2000 + Math.random() * 5000;
        await new Promise((r) => setTimeout(r, wait));
        if (cancelRef.current) break;

        // Squeeze to invisible
        await controls.start({ scaleX: 0, transition: { duration: 0.15, ease: 'easeIn' } });
        if (cancelRef.current) break;

        // Swap word while invisible, then wait one frame to ensure re-render
        setFace((f) => (f === 'en' ? 'he' : 'en'));
        await new Promise((r) => requestAnimationFrame(r));
        if (cancelRef.current) break;

        // Expand back with new word
        await controls.start({ scaleX: 1, transition: { duration: 0.15, ease: 'easeOut' } });
      }
    };

    run();
    return () => { cancelRef.current = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const text = face === 'en' ? wordPair.english : wordPair.hebrew;

  /*
   * CRITICAL: Two separate DOM nodes.
   * - Outer div  ג†’ CSS `fw-drift` animation  (transform: translate)
   * - Inner motion.span ג†’ FM scaleX animation (transform: scaleX)
   * Framer Motion sets transform via inline style which would override
   * the CSS keyframe if placed on the same element.
   */
  return (
    <div
      style={{
        position:      'absolute',
        left:          `${config.startX}vw`,
        top:           `${config.startY}vh`,
        animation:     `fw-drift ${config.duration}s linear ${config.delay}s infinite`,
        pointerEvents: 'none',
        userSelect:    'none',
      }}
    >
      <motion.span
        animate={controls}
        style={{
          display:       'inline-block',
          fontSize:      `${config.fontSize}px`,
          opacity:       config.opacity,
          color:         'var(--fw-word-color)',
          fontWeight:    config.fontSize > 17 ? 600 : 400,
          letterSpacing: '0.03em',
          whiteSpace:    'nowrap',
          filter:        'blur(0.5px)',
        }}
      >
        {text}
      </motion.span>
    </div>
  );
};

/* ג”€ג”€ג”€ Root component ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ */
const FloatingWordsBackground = () => {
  // Initialise with fallback immediately so words appear on first render.
  const [particles, setParticles] = useState(() => buildParticles(FALLBACK_WORDS));

  useEffect(() => {
    // Attempt to enrich with real DB words once the user is authenticated.
    apiClient
      .get('/v1/review/sample', { params: { limit: 40 } })
      .then((res) => {
        if (res.data?.words?.length > 0) {
          setParticles(buildParticles(res.data.words));
        }
      })
      .catch(() => { /* Silently keep fallback words */ });
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset:    0,
        zIndex:   -1,
        overflow: 'hidden',
      }}
    >
      {/* Brighter deep-blue gradient */}
      <div style={{
        position:   'absolute',
        inset:      0,
        background: 'var(--fw-bg)',
      }} />

      {/* Ambient glow orbs ג€” boosted opacity for more vibrancy */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%',
        width: '60vw', height: '60vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
        filter: 'blur(70px)',
      }} />
      <div style={{
        position: 'absolute', top: '30%', right: '-8%',
        width: '50vw', height: '50vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
        filter: 'blur(65px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '5%', left: '25%',
        width: '45vw', height: '45vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)',
        filter: 'blur(65px)',
      }} />
      <div style={{
        position: 'absolute', top: '55%', left: '45%',
        width: '35vw', height: '35vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)',
        filter: 'blur(55px)',
      }} />

      {/* Floating word particles */}
      {particles.map((config) => (
        <WordParticle key={config.id} wordPair={config.wordPair} config={config} />
      ))}
    </div>
  );
};

export default FloatingWordsBackground;

