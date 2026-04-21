'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
      {/* Logo / Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="mb-16"
      >
        <p
          className="text-xs uppercase tracking-[0.3em] mb-6"
          style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-body)' }}
        >
          A memory experience
        </p>
        <h1
          className="text-7xl font-light leading-none mb-4"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
        >
          12:00 AM
        </h1>
        <p
          className="text-sm font-light max-w-xs mx-auto"
          style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}
        >
          Gather moments from the people who love you.
          <br />
          Unlock them at midnight.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <Link href="/host" className="btn-primary text-center no-underline">
          Create an Event
        </Link>
        <p
          className="text-xs text-center"
          style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
        >
          Free. No signup. Just tonight.
        </p>
      </motion.div>

      {/* Ambient orb */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(201, 168, 76, 0.04) 0%, transparent 70%)',
          zIndex: -1,
        }}
      />
    </div>
  );
}
