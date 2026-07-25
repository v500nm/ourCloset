'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ModeSelector, ContextPresets, FreeformInput, useContextResolver } from '@/features/context';
import { TwinningMatchResults } from '@/features/twinning';
import { StitchingAccent, Button } from '@/components';
import { MotionText, MotionContainer } from '@/components/ui/motionText';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from '@/components/layout/header';
import { HouseholdProvider, useHousehold, FamilyMember } from '@/providers/HouseholdProvider';

const DEMO_MEMBERS: FamilyMember[] = [
  {
    id: 'demo-husband',
    name: 'Husband',
    role: 'husband',
    hierarchyRole: 'head_of_household',
    customRoleLabel: 'Husband',
    closetCount: 24,
    privacyTier: 'PUBLIC',
    joinedAt: '2026-01-15',
  },
  {
    id: 'demo-wife',
    name: 'Wife',
    role: 'wife',
    hierarchyRole: 'spouse',
    customRoleLabel: 'Wife',
    closetCount: 38,
    privacyTier: 'PUBLIC',
    joinedAt: '2026-01-15',
  },
];

// ---------------------------------------------------------------------------
// DEMO FLOW
// Every waypoint names the exact element id the cursor should travel to.
// The runner below is generic: it never hardcodes "step 3 does X" logic,
// it just walks this list. Add/reorder waypoints here to change the tour.
// `align` controls where the element lands in the (virtual) viewport once
// centered — 'center' for most, 'top' for the results board since it's tall.
// ---------------------------------------------------------------------------
type DemoStep = {
  targetId: string | 'top'; // 'top' = scroll virtual position back to 0
  align?: 'center' | 'top';
  action: (ctx: DemoActions) => Promise<void> | void;
  waitBefore?: number;
  waitAfter?: number;
};

type DemoActions = {
  click: () => Promise<void>;
  type: (text: string) => Promise<void>;
};

function DemoContent() {
  const {
    mode,
    setMode,
    selectedPreset,
    selectedSubPreset,
    resolvePreset,
    resolveFreeform,
    resolvedContext,
    loading,
  } = useContextResolver();

  const { members, primaryCoupleIds } = useHousehold();
  const [showResults, setShowResults] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isClicking, setIsClicking] = useState(false);
  const [typingText, setTypingText] = useState('');

  // Virtual scroll offset in px. Content is translated by -virtualScrollY.
  // Because there is no real native scroll happening, the user has nothing
  // to grab with a wheel/trackpad/scrollbar — this number is the only
  // source of truth for "where the page is".
  const [virtualScrollY, setVirtualScrollY] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

  // Waits for the CSS transform transition on the content wrapper to finish,
  // rather than guessing a delay or polling window.scrollY (which doesn't
  // exist for us anymore since nothing natively scrolls).
  const waitForTransformSettle = () =>
    new Promise<void>(resolve => {
      const el = contentRef.current;
      if (!el) return resolve();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        el.removeEventListener('transitionend', onEnd);
        resolve();
      };
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName === 'transform') finish();
      };
      el.addEventListener('transitionend', onEnd);
      // Safety fallback in case transitionend doesn't fire (e.g. 0-distance scroll)
      setTimeout(finish, 750);
    });

  // Computes and applies the virtual scroll offset needed to bring an
  // element into view, then waits for that (synthetic) scroll to finish.
  const scrollTargetIntoView = useCallback(
    async (targetId: string | 'top', align: 'center' | 'top' = 'center') => {
      const viewport = viewportRef.current;
      const content = contentRef.current;
      if (!viewport || !content) return;

      const viewportHeight = viewport.clientHeight;
      const contentHeight = content.scrollHeight;
      const maxScroll = Math.max(0, contentHeight - viewportHeight);

      let nextScroll = 0;
      if (targetId !== 'top') {
        const el = document.getElementById(targetId);
        if (!el) return;
        // offsetTop relative to the untransformed content flow
        let elTop = 0;
        let node: HTMLElement | null = el;
        while (node && node !== content) {
          elTop += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }
        const elHeight = el.offsetHeight;
        nextScroll =
          align === 'top'
            ? elTop - 96 // small breathing room below the fixed header
            : elTop - viewportHeight / 2 + elHeight / 2;
      }

      nextScroll = Math.max(0, Math.min(maxScroll, nextScroll));
      const distance = Math.abs(nextScroll - virtualScrollY);
      setVirtualScrollY(nextScroll);
      if (distance > 2) await waitForTransformSettle();
    },
    [virtualScrollY]
  );

  // Moves the fake cursor to an element's *current, post-scroll* rect.
  // Because getBoundingClientRect() reflects the already-applied transform,
  // this is always measuring the real rendered position — cursor and
  // target can't go out of sync the way they did with pre-scroll caching.
  const moveCursorTo = useCallback(async (elementId: string) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCursorVisible(true);
    setCursorPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    await wait(700); // let the cursor's spring finish traveling
  }, []);

  const goTo = useCallback(
    async (step: DemoStep) => {
      if (step.targetId === 'top') {
        await scrollTargetIntoView('top');
        return;
      }
      await scrollTargetIntoView(step.targetId, step.align ?? 'center');
      await moveCursorTo(step.targetId);
    },
    [scrollTargetIntoView, moveCursorTo]
  );

  const clickCursor = async () => {
    setIsClicking(true);
    await wait(200);
    setIsClicking(false);
    await wait(200);
  };

  const typeIntoField = async (fullText: string) => {
    for (let i = 1; i <= fullText.length; i++) {
      setTypingText(fullText.slice(0, i));
      await wait(20 + Math.random() * 40);
    }
    await wait(400);
  };

  useEffect(() => {
    let isCancelled = false;
    const guard = async <T,>(p: Promise<T>) => (isCancelled ? undefined : p);

    // --- Hard scroll lock -------------------------------------------------
    // The viewport container is overflow:hidden with a fixed height, and we
    // also lock html/body overflow. There is no native scrollable region
    // anywhere on the page while the demo runs, so wheel/trackpad/scrollbar/
    // keyboard scrolling all have nothing to act on. The wheel/touch/keydown
    // blockers below are just a defensive backstop for edge cases (e.g. a
    // nested scrollable widget) and to stop iOS rubber-band bounce.
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    const blockScrollInput = (e: Event) => e.preventDefault();
    const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
    const blockKeyScroll = (e: KeyboardEvent) => {
      if (scrollKeys.includes(e.key)) e.preventDefault();
    };
    window.addEventListener('wheel', blockScrollInput, { passive: false });
    window.addEventListener('touchmove', blockScrollInput, { passive: false });
    window.addEventListener('keydown', blockKeyScroll, { passive: false });

    const releaseScrollLock = () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      window.removeEventListener('wheel', blockScrollInput);
      window.removeEventListener('touchmove', blockScrollInput);
      window.removeEventListener('keydown', blockKeyScroll);
    };

    // --- The flow -----------------------------------------------------------
    const flow: DemoStep[] = [
      {
        targetId: 'top',
        action: async () => {},
        waitBefore: 500,
      },
      {
        targetId: 'demo-couple-btn',
        action: async ({ click }) => {
          await click();
          const hId = primaryCoupleIds?.[0] || members[0]?.id;
          const wId = primaryCoupleIds?.[1] || members[1]?.id;
          if (hId && wId) setMode({ type: 'couple', memberIds: [hId, wId] });
          setDemoStep(1);
        },
        waitBefore: 400,
        waitAfter: 500,
      },
      {
        targetId: 'demo-event-btn',
        action: async ({ click }) => {
          await click();
          resolvePreset('Event', 'Sangeet');
          setDemoStep(2);
        },
        waitAfter: 500,
      },
      {
        targetId: 'demo-wedding-btn',
        action: async ({ click }) => {
          await click();
          resolvePreset('Event', 'Wedding');
        },
        waitAfter: 500,
      },
      {
        targetId: 'demo-input-field',
        action: async ({ click, type }) => {
          await click();
          await type('Formal traditional wear for a family wedding.');
        },
        waitAfter: 300,
      },
      {
        targetId: 'demo-generate-btn',
        action: async ({ click }) => {
          await click();
          resolveFreeform('Formal traditional wear for a family wedding.');
          setDemoStep(3);
          await wait(1500); // simulate AI thinking
          setShowResults(true);
        },
        waitAfter: 300,
      },
      {
        targetId: 'demo-results-section',
        align: 'top',
        action: async () => {},
        waitAfter: 2600,
      },
      {
        // Auto-scroll back up so the CTA modal never opens over a hidden section
        targetId: 'top',
        action: async () => {
          setCursorVisible(false); // modal is a fixed overlay; cursor isn't needed for it
          setDemoStep(4);
        },
        waitBefore: 300,
      },
    ];

    const runFlow = async () => {
      for (const step of flow) {
        if (isCancelled) return;
        if (step.waitBefore) await guard(wait(step.waitBefore));
        if (isCancelled) return;
        await guard(goTo(step));
        if (isCancelled) return;
        await guard(
          Promise.resolve(
            step.action({
              click: clickCursor,
              type: typeIntoField,
            })
          )
        );
        if (step.waitAfter) await guard(wait(step.waitAfter));
      }
      releaseScrollLock();
    };

    runFlow();

    return () => {
      isCancelled = true;
      releaseScrollLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-surface/10 cursor-none" />

      {cursorVisible && (
        <motion.div
          className="fixed z-50 pointer-events-none drop-shadow-2xl"
          animate={{
            x: cursorPos.x,
            y: cursorPos.y,
            scale: isClicking ? 0.9 : 1,
          }}
          transition={{ type: 'spring', stiffness: 150, damping: 20, mass: 0.5 }}
          style={{ marginLeft: '-6px', marginTop: '-4px' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M5.5 3.21V20.8C5.5 21.43 6.2 21.8 6.7 21.43L11.4 16.7H17.5C18.13 16.7 18.5 16 18.21 15.5L5.5 3.21Z"
              fill="#1C1B1F"
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
          {isClicking && (
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute top-1 left-1 w-6 h-6 bg-secondary rounded-full -z-10"
            />
          )}
        </motion.div>
      )}

      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-secondary text-on-secondary px-6 py-2 rounded-full font-bold shadow-2xl flex items-center gap-3">
        <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
        Interactive Demo Playing...
      </div>

      {/* Virtual scroll viewport: overflow hidden, fixed height — nothing
          native for the user to scroll. `content` below is what actually
          moves, via transform, driven only by our own state. */}
      <div ref={viewportRef} className="relative overflow-hidden" style={{ height: 'calc(100vh - 7rem)' }}>
        <div
          ref={contentRef}
          className="space-y-10 max-w-container mx-auto"
          style={{
            transform: `translateY(${-virtualScrollY}px)`,
            transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'transform',
          }}
        >
          <MotionContainer staggerChildren={0.1} className="text-center md:text-left">
            <MotionText as="span" className="spec-label text-primary/60 uppercase tracking-widest mb-2 block">
              Mode Selector
            </MotionText>
            <MotionText as="h1" className="font-display text-display-lg-mobile md:text-display-lg text-primary">
              Who are we dressing?
            </MotionText>
            <MotionText as="div">
              <StitchingAccent centered className="mt-6 md:mx-0" />
            </MotionText>
          </MotionContainer>

          <ModeSelector currentMode={mode} onModeChange={() => {}} />

          <div className="stitching-border-full" />

          <ContextPresets
            selectedPreset={selectedPreset}
            selectedSubPreset={selectedSubPreset}
            onPresetChange={() => {}}
          />

          <FreeformInput
            onGenerate={() => {}}
            resolvedContext={resolvedContext}
            loading={loading || demoStep === 3}
            overrideText={typingText || undefined}
          />

          {showResults && (
            <div id="demo-results-section" className="pt-6 pb-20">
              <TwinningMatchResults
                activeMode={mode}
                eventContext={
                  resolvedContext
                    ? `Matched: ${resolvedContext.label}`
                    : `${selectedSubPreset || selectedPreset} Coordination`
                }
              />
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {demoStep === 4 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur-md pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="bg-surface-container-lowest p-8 rounded-2xl shadow-2xl border border-outline-variant/30 text-center max-w-md mx-4"
            >
              <h2 className="font-display text-3xl font-bold text-primary mb-4">Ready to try it yourself?</h2>
              <p className="text-on-surface-variant mb-8">
                Create a free account to set up your household, digitize your wardrobe, and start receiving
                AI-generated outfit recommendations without needing paid API keys.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/pricing">
                  <Button className="w-full justify-center py-4 text-lg bg-primary text-on-primary">
                    Select Plan
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="w-full justify-center py-4 text-lg border-outline-variant/50">
                    Login
                  </Button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-raw-silk text-charcoal-thread flex flex-col relative overflow-hidden">
      <Header />
      <main className="flex-grow pt-28 px-4 relative z-30 pb-0">
        <HouseholdProvider initialMembers={DEMO_MEMBERS}>
          <DemoContent />
        </HouseholdProvider>
      </main>
    </div>
  );
}