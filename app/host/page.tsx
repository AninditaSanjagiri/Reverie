'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { generateSlug, setHostSession } from '@/lib/utils';

export default function HostPage() {
  const router = useRouter();
  const [hostName, setHostName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!hostName.trim() || !guestName.trim()) return;

    setLoading(true);
    setError('');

    try {
      const slug = generateSlug(guestName);

      const { data, error: dbError } = await supabase
        .from('events')
        .insert({
          slug,
          host_name: hostName.trim(),
          guest_name: guestName.trim(),
          reveal_unlocked: false,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Mark this browser as the host
      setHostSession(slug);

      // Go to host dashboard
      router.push(`/event/${slug}/vault?host=true`);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-dvh px-6 safe-top safe-bottom">
      {/* Back */}
      <motion.a
        href="/"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="inline-flex items-center gap-2 pt-6 pb-2 text-sm no-underline"
        style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-body)' }}
      >
        ← Back
      </motion.a>

      {/* Form */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <p
            className="text-xs uppercase tracking-[0.25em] mb-3"
            style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-body)' }}
          >
            Create event
          </p>
          <h1
            className="text-4xl font-light mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Who is this
            <br />
            <em>for?</em>
          </h1>
          <p
            className="text-sm mb-10"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Tonight, your friends will gather memories.
            <br />
            They unlock at midnight.
          </p>

          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label
                className="block text-xs uppercase tracking-widest mb-2"
                style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
              >
                Your name
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="The host"
                className="input-elegant"
                maxLength={50}
                required
              />
            </div>

            <div>
              <label
                className="block text-xs uppercase tracking-widest mb-2"
                style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
              >
                Guest of honor
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Nishant"
                className="input-elegant"
                maxLength={50}
                required
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm px-4 py-3 rounded-xl"
                  style={{
                    background: 'rgba(255, 80, 80, 0.08)',
                    color: 'rgba(255, 120, 120, 0.9)',
                    border: '1px solid rgba(255, 80, 80, 0.15)',
                  }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || !hostName.trim() || !guestName.trim()}
              whileTap={{ scale: 0.98 }}
              className="btn-primary mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border border-black/30 border-t-black rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create the Night'
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
