'use client';

import { motion, useReducedMotion } from 'motion/react';

/**
 * The ambient field beneath the momentum number. Two soft radial blobs whose
 * hue follows --momentum-hue (registered with @property so it glides).
 * Cool and still at low values, warm and alive at high ones — never red.
 */
export default function AmbientGradient() {
  const reduced = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[24rem]">
      <motion.div
        className="absolute left-1/2 top-1/2 h-[24rem] w-[24rem] rounded-full blur-3xl"
        style={{
          x: '-50%',
          y: '-50%',
          background:
            'radial-gradient(circle, oklch(0.55 0.13 var(--momentum-hue)) 0%, transparent 62%)',
          opacity: 0.34,
        }}
        animate={
          reduced
            ? undefined
            : { translateX: [-16, 12, -16], translateY: [-8, 10, -8], scale: [1, 1.07, 1] }
        }
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[15rem] w-[15rem] rounded-full blur-3xl"
        style={{
          x: '-50%',
          y: '-50%',
          background:
            'radial-gradient(circle, oklch(0.6 0.11 calc(var(--momentum-hue) + 30)) 0%, transparent 60%)',
          opacity: 0.22,
        }}
        animate={
          reduced
            ? undefined
            : { translateX: [20, -14, 20], translateY: [12, -10, 12], scale: [1.05, 0.97, 1.05] }
        }
        transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
