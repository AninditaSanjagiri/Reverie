'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, type Event } from '@/lib/supabase';
import { setParticipantSession, getParticipantSession } from '@/lib/utils';

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if already joined
    const session = getParticipantSession(slug);
    if (session) {
      router.replace(`/event/${slug}/camera`);
      return;
    }

    // Fetch event info
    async function fetchEvent() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        setError('Event not found.');
      } else {
        setEvent(data);
      }
      setFetching(false);
    }
    fetchEvent();
  }, [slug, router]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !event) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: dbError } = await supabase
        .from('participants')
        .insert({
          event_id: event.id,
          name: name.trim(),
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setParticipantSession(slug, data.id, name.trim());
      router.push(`/event/${slug}/camera`);
    } catch {
      setError('Could not join. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div
          className="w-6 h-6 rounded-full border border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-gold)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
        <p className="text-5xl mb-6" style={{ fontFamily: 'var(--font-display)' }}>404</p>
        <p style={{ color: 'var(--color-text-muted)' }}>This event doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh px-6 safe-top safe-bottom">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Event label */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{
              background: 'var(--color-gold-soft)',
              border: '1px solid rgba(201, 168, 76, 0.2)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--color-gold)' }}
            />
            <span
              className="text-xs uppercase tracking-widest"
              style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-mono)' }}
            >
              Tonight's event
            </span>
          </div>

          <h1
            className="text-5xl font-light mb-2 leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {event?.guest_name}'s
            <br />
            <em>Birthday</em>
          </h1>

          <p className="text-sm mb-10" style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
            You'll get 15 shots and 1 short video.
            <br />
            Everything unlocks for {event?.guest_name} at midnight.
          </p>

          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div>
              <label
                className="block text-xs uppercase tracking-widest mb-2"
                style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
              >
                What's your name?
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="input-elegant"
                maxLength={30}
                autoFocus
                required
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm"
                  style={{ color: 'rgba(255, 120, 120, 0.9)' }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || !name.trim()}
              whileTap={{ scale: 0.98 }}
              className="btn-primary mt-2 disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border border-black/30 border-t-black rounded-full animate-spin" />
                  Joining...
                </span>
              ) : (
                'Join the Night'
              )}
            </motion.button>
          </form>

          {/* Stats */}
          <div
            className="mt-8 pt-6 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <div>
              <p
                className="text-xs uppercase tracking-widest mb-1"
                style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
              >
                Hosted by
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {event?.host_name}
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-xs uppercase tracking-widest mb-1"
                style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
              >
                Your shots
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                15 photos · 1 video
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
