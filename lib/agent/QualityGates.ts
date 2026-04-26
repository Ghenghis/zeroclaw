/**
 * QualityGates.ts
 * Code quality and accessibility checks run by the agent before atomic swap.
 * Static analysis — no browser runtime required.
 */

export interface QualityIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  fix: string;
}

export interface QualityCheckResult {
  passed:      boolean;
  score:       number;        // 0-100
  issues:      QualityIssue[];
  suggestions: string[];
}

export interface GeneratedOutput {
  heroComponent:  string;
  fontConfig:     string;
  components:     string[];
  animationCode:  string[];
  css:            string;
  globalCss:      string;
  gsapCode:       string;
  hasGSAP:        boolean;
  hasCustomCursor: boolean;
  layoutFile:     string;
  footerComponent: string;
  notFoundPage:   string;
  metaTags:       string[];
  generatedFiles: string[];
  generatedAssets: string[];
  theme: {
    palette: {
      text:       string;
      background: string;
      accent:     string;
    };
  };
  cssIncludes: (pattern: string) => boolean;
}

// ─── Performance Gates ────────────────────────────────────────────────────────

export function checkLCP(output: GeneratedOutput): QualityCheckResult {
  const issues: QualityIssue[] = [];

  if (!output.heroComponent.includes('next/image')) {
    issues.push({
      type: 'error',
      message: 'Hero image must use next/image for automatic optimization',
      fix: "Replace <img> with <Image> from 'next/image'",
    });
  }
  if (!output.heroComponent.includes('priority')) {
    issues.push({
      type: 'warning',
      message: 'Hero/LCP image missing priority prop',
      fix: 'Add priority prop to above-fold Image component',
    });
  }
  if (!output.fontConfig.includes('display=swap')) {
    issues.push({
      type: 'error',
      message: 'Font loading blocks LCP — missing display=swap',
      fix: 'Add display=swap to Google Fonts URL',
    });
  }

  return {
    passed:      issues.filter(i => i.type === 'error').length === 0,
    score:       Math.max(0, 100 - issues.length * 15),
    issues,
    suggestions: ['Target LCP < 2.5s via next/image priority + font display swap'],
  };
}

export function checkCLS(output: GeneratedOutput): QualityCheckResult {
  const issues: QualityIssue[] = [];

  const imgMissingDims = output.components.filter(c =>
    c.includes('<Image') && !c.includes('fill') &&
    (!c.includes('width=') || !c.includes('height='))
  );
  if (imgMissingDims.length > 0) {
    issues.push({
      type: 'error',
      message: `${imgMissingDims.length} Image(s) missing explicit dimensions — causes CLS`,
      fix: 'Add width and height props to all Image components',
    });
  }

  const asyncWithoutSkeleton = output.components.filter(c =>
    (c.includes('useEffect') || c.includes('Suspense')) &&
    !c.includes('Skeleton') && !c.includes('loading')
  );
  if (asyncWithoutSkeleton.length > 0) {
    issues.push({
      type: 'warning',
      message: `${asyncWithoutSkeleton.length} async component(s) missing skeleton state`,
      fix: 'Add skeleton placeholder while data loads',
    });
  }

  return {
    passed:      issues.filter(i => i.type === 'error').length === 0,
    score:       Math.max(0, 100 - issues.length * 20),
    issues,
    suggestions: ['Target CLS < 0.1 via explicit image dimensions and skeleton loaders'],
  };
}

export function checkAnimationCompositing(output: GeneratedOutput): QualityCheckResult {
  const issues: QualityIssue[] = [];
  const BAD_PROPS = ['width', 'height', 'top:', 'left:', 'margin', 'padding', 'font-size'];

  output.animationCode.forEach(anim => {
    BAD_PROPS.forEach(prop => {
      if (new RegExp(`animate.*${prop}|${prop}.*animate`, 'i').test(anim)) {
        issues.push({
          type: 'error',
          message: `Animation uses non-composited property: ${prop}`,
          fix: `Replace ${prop} animation with transform/opacity equivalent`,
        });
      }
    });
  });

  return {
    passed:      issues.filter(i => i.type === 'error').length === 0,
    score:       Math.max(0, 100 - issues.length * 25),
    issues,
    suggestions: ['Only animate transform, opacity, filter — never layout properties'],
  };
}

// ─── Accessibility Gates ──────────────────────────────────────────────────────

function computeContrastRatio(fg: string, bg: string): number {
  const lum = (hex: string): number => {
    const c = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map(i => {
      const v = parseInt(c.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const L1 = lum(fg), L2 = lum(bg);
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

export function checkWCAGContrast(output: GeneratedOutput): QualityCheckResult {
  const issues: QualityIssue[] = [];
  const { text, background } = output.theme.palette;

  try {
    const ratio = computeContrastRatio(text, background);
    if (ratio < 4.5) {
      issues.push({
        type: 'error',
        message: `Text/BG contrast ${ratio.toFixed(2)}:1 fails WCAG AA (needs 4.5:1)`,
        fix: `Increase contrast between ${text} and ${background}`,
      });
    }
    return {
      passed: ratio >= 4.5,
      score:  ratio >= 7 ? 100 : ratio >= 4.5 ? 80 : 40,
      issues,
      suggestions: ['Target 7:1 for WCAG AAA compliance'],
    };
  } catch {
    return { passed: true, score: 70, issues: [], suggestions: ['Could not parse hex colors for contrast check'] };
  }
}

export function checkKeyboardNav(output: GeneratedOutput): QualityCheckResult {
  const issues: QualityIssue[] = [];

  const clickWithoutKb = output.components.filter(c =>
    c.includes('onClick') &&
    !c.includes('onKeyDown') && !c.includes('role=') &&
    !/button|input|a href|select|textarea/.test(c)
  );
  if (clickWithoutKb.length > 0) {
    issues.push({
      type: 'error',
      message: `${clickWithoutKb.length} clickable element(s) missing keyboard support`,
      fix: 'Add role="button" + onKeyDown, or replace with <button>',
    });
  }

  return {
    passed:      issues.filter(i => i.type === 'error').length === 0,
    score:       Math.max(0, 100 - issues.length * 30),
    issues,
    suggestions: [],
  };
}

export function checkReducedMotion(output: GeneratedOutput): QualityCheckResult {
  const issues: QualityIssue[] = [];

  if (!output.globalCss.includes('prefers-reduced-motion')) {
    issues.push({
      type: 'error',
      message: 'Missing @media (prefers-reduced-motion: reduce) CSS block',
      fix: 'Add reduced motion media query disabling all animations',
    });
  }
  if (output.hasGSAP && !output.gsapCode.includes('matchMedia')) {
    issues.push({
      type: 'warning',
      message: 'GSAP animations not gated by prefers-reduced-motion',
      fix: 'Wrap GSAP in gsap.matchMedia() with zero-duration variant',
    });
  }

  return {
    passed:      issues.filter(i => i.type === 'error').length === 0,
    score:       issues.length === 0 ? 100 : 50,
    issues,
    suggestions: [
      '@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important}}',
    ],
  };
}

// ─── Visual Quality Checklist ─────────────────────────────────────────────────

export interface VisualCheck {
  id:       string;
  name:     string;
  required: boolean;
  points:   number;
  verify:   (output: GeneratedOutput) => boolean;
}

export const VISUAL_CHECKLIST: VisualCheck[] = [
  { id: 'scroll-animation',   name: 'Scroll-triggered animation section',   required: true,  points: 10, verify: o => o.animationCode.some(a => a.includes('ScrollTrigger') || a.includes('useInView')) },
  { id: 'page-entry',         name: 'Smooth page entry animation',          required: true,  points: 8,  verify: o => o.layoutFile.includes('AnimatePresence') || o.layoutFile.includes('motion.div') },
  { id: 'hover-states',       name: 'Button hover states present in CSS',   required: true,  points: 10, verify: o => o.css.includes(':hover') },
  { id: 'loading-states',     name: 'Loading/skeleton states for async',    required: true,  points: 8,  verify: o => o.components.some(c => c.includes('Skeleton') || c.includes('loading') || c.includes('Suspense')) },
  { id: 'wow-moment',         name: 'At least one "wow" visual effect',     required: true,  points: 15, verify: o => o.components.some(c => ['WebGL','particle','canvas','shader','3D','lottie'].some(w => c.includes(w))) },
  { id: 'footer-complete',    name: 'Footer with DaveAI credit + copyright', required: true, points: 5,  verify: o => o.footerComponent.includes('DaveAI') && o.footerComponent.includes('©') },
  { id: 'mobile-responsive',  name: 'Responsive from 320px to 4K',         required: true,  points: 12, verify: o => o.css.includes('320') || o.css.includes('min-width') },
  { id: 'og-image',           name: 'Open Graph image generated',           required: true,  points: 5,  verify: o => o.metaTags.some(m => m.includes('og:image')) },
  { id: 'sitemap',            name: 'sitemap.ts generated',                 required: true,  points: 3,  verify: o => o.generatedFiles.includes('sitemap.ts') },
  { id: 'privacy-page',       name: 'Privacy policy page exists',           required: true,  points: 3,  verify: o => o.generatedFiles.includes('privacy/page.tsx') },
  { id: 'creative-404',       name: 'Creative not-found.tsx page',         required: true,  points: 5,  verify: o => o.generatedFiles.includes('not-found.tsx') && o.notFoundPage.length > 100 },
  { id: 'dark-mode',          name: 'Dark/light mode support',              required: false, points: 8,  verify: o => o.css.includes('prefers-color-scheme') || o.components.some(c => c.includes('ThemeToggle')) },
  { id: 'custom-cursor',      name: 'Custom cursor (non-mobile)',           required: false, points: 5,  verify: o => o.components.some(c => c.includes('CustomCursor')) },
];

export function runVisualChecklist(output: GeneratedOutput): {
  score: number; passed: boolean; failedChecks: string[];
} {
  const MIN_SCORE = 80;
  let earned = 0;
  const total = VISUAL_CHECKLIST.reduce((s, c) => s + c.points, 0);
  const failedChecks: string[] = [];

  for (const check of VISUAL_CHECKLIST) {
    if (check.verify(output)) {
      earned += check.points;
    } else {
      failedChecks.push(check.name);
      if (check.required) console.error(`[QualityGate] REQUIRED FAILED: ${check.name}`);
    }
  }

  const score = Math.round((earned / total) * 100);
  return { score, passed: score >= MIN_SCORE, failedChecks };
}

// ─── Run All Gates ────────────────────────────────────────────────────────────

export function runAllQualityGates(output: GeneratedOutput): {
  passed: boolean;
  totalScore: number;
  results: Record<string, QualityCheckResult>;
  visualChecklist: ReturnType<typeof runVisualChecklist>;
} {
  const results = {
    lcp:                checkLCP(output),
    cls:                checkCLS(output),
    animationCompositing: checkAnimationCompositing(output),
    wcagContrast:       checkWCAGContrast(output),
    keyboardNav:        checkKeyboardNav(output),
    reducedMotion:      checkReducedMotion(output),
  };

  const visualChecklist = runVisualChecklist(output);
  const scores = Object.values(results).map(r => r.score);
  const totalScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const allGatesPassed = Object.values(results).every(r => r.passed);

  return {
    passed: allGatesPassed && visualChecklist.passed,
    totalScore,
    results,
    visualChecklist,
  };
}
