'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { supabase, type Event, type Memory } from '@/lib/supabase';
import Image from 'next/image';

type RevealStage = 'silence' | 'name' | 'whispers' | 'gallery' | 'ending';

export default function RevealPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stage, setStage] = useState<RevealStage>('silence');
  const [whisperIndex, setWhisperIndex] = useState(0);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);

  const whispers = memories.filter(m => m.whisper_message);
  const photos = memories.filter(m => m.type === 'photo');

  useEffect(() => {
    async function load() {
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!eventData) { router.replace('/'); return; }
      if (!eventData.reveal_unlocked) {
        router.replace(`/event/${slug}/vault`);
        return;
      }

      setEvent(eventData);

      const { data: memoriesData } = await supabase
        .from('memories')
        .select('*')
        .eq('event_id', eventData.id)
        .order('created_at', { ascending: true });

      setMemories(memoriesData || []);
      setLoading(false);
    }
    load();
  }, [slug, router]);

  function beginReveal() {
    setStarted(true);
    setStage('silence');

    setTimeout(() => setStage('name'), 800);
    setTimeout(() => {
      if (whispers.length > 0) {
        setStage('whispers');
      } else {
        setStage('gallery');
      }
    }, 3500);
  }

  useEffect(() => {
    if (stage !== 'whispers' || whispers.length === 0) return;

    const duration = 2800;
    const timer = setInterval(() => {
      setWhisperIndex(i => {
        if (i >= whispers.length - 1) {
          clearInterval(timer);
          setTimeout(() => setStage('gallery'), 1200);
          return i;
        }
        return i + 1;
      });
    }, duration);

    return () => clearInterval(timer);
  }, [stage, whispers.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-black">
        <div
          className="w-5 h-5 rounded-full border border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-gold)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  // Start screen
  if (!started) {
    return (
      <StartScreen
        guestName={event?.guest_name || ''}
        memoriesCount={memories.length}
        participantsCount={[...new Set(memories.map(m => m.participant_name))].length}
        onStart={beginReveal}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-black overflow-hidden">

      {/* Stage: Silence */}
      <AnimatePresence>
        {stage === 'silence' && (
          <motion.div
            className="fixed inset-0 bg-black z-50"
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          />
        )}
      </AnimatePresence>

      {/* Stage: Name */}
      <AnimatePresence>
        {stage === 'name' && (
          <motion.div
            className="fixed inset-0 flex flex-col items-center justify-center z-40"
            style={{ background: '#000' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            <motion.p
              className="text-sm uppercase tracking-[0.4em] mb-6"
              style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-mono)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 1 }}
            >
              tonight
            </motion.p>
            <motion.h1
              className="font-light text-center leading-none"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(3rem, 16vw, 7rem)',
                letterSpacing: '-0.02em',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {event?.guest_name}.
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage: Whispers */}
      <AnimatePresence>
        {stage === 'whispers' && whispers.length > 0 && (
          <motion.div
            className="fixed inset-0 flex flex-col items-center justify-center px-10 z-30"
            style={{ background: '#000' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            {/* Progress dots */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 flex gap-2">
              {whispers.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-500"
                  style={{
                    width: i === whisperIndex ? '20px' : '6px',
                    height: '6px',
                    background: i === whisperIndex
                      ? 'var(--color-gold)'
                      : 'rgba(255,255,255,0.15)',
                  }}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={whisperIndex}
                className="text-center max-w-xs"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              >
                <p
                  className="mb-6 leading-relaxed"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.3rem, 5vw, 1.8rem)',
                    fontStyle: 'italic',
                    color: 'rgba(255,255,255,0.88)',
                    lineHeight: 1.5,
                  }}
                >
                  "{whispers[whisperIndex]?.whisper_message}"
                </p>
                <p
                  className="text-xs uppercase tracking-[0.25em]"
                  style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-mono)' }}
                >
                  — {whispers[whisperIndex]?.participant_name}
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage: Gallery */}
      <AnimatePresence>
        {(stage === 'gallery' || stage === 'ending') && (
          <motion.div
            className="min-h-dvh"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
          >
            <GalleryReveal
              event={event!}
              memories={memories}
              onSelectMemory={setSelectedMemory}
              onEnd={() => setStage('ending')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedMemory && (
          <Lightbox memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Start Screen ────────────────────────────────────────────────────────────

function StartScreen({
  guestName,
  memoriesCount,
  participantsCount,
  onStart,
}: {
  guestName: string;
  memoriesCount: number;
  participantsCount: number;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-8 text-center bg-black">
      {/* Ambient glow */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10"
      >
        <p
          className="text-xs uppercase tracking-[0.4em] mb-8"
          style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-mono)' }}
        >
          12:00 AM
        </p>

        <h1
          className="font-light mb-4 leading-tight"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 11vw, 5rem)',
            letterSpacing: '-0.01em',
          }}
        >
          Built tonight
          <br />
          by people who
          <br />
          <em>love you.</em>
        </h1>

        <p
          className="text-sm mb-12 max-w-xs mx-auto"
          style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}
        >
          {participantsCount} {participantsCount === 1 ? 'person' : 'people'} left{' '}
          {memoriesCount} {memoriesCount === 1 ? 'memory' : 'memories'} for you tonight.
          <br />
          This is yours.
        </p>

        <motion.button
          onClick={onStart}
          whileTap={{ scale: 0.97 }}
          className="btn-primary px-10 py-4"
        >
          Open Your Night
        </motion.button>
      </motion.div>
    </div>
  );
}

// ─── Gallery Reveal ───────────────────────────────────────────────────────────

function GalleryReveal({
  event,
  memories,
  onSelectMemory,
  onEnd,
}: {
  event: Event;
  memories: Memory[];
  onSelectMemory: (m: Memory) => void;
  onEnd: () => void;
}) {
  const photos = memories.filter(m => m.type === 'photo');
  const videos = memories.filter(m => m.type === 'video');
  const contributors = [...new Set(memories.map(m => m.participant_name))];

  return (
    <div className="px-5 safe-top pt-8 pb-24">

      {/* Header */}
      <motion.div
        className="mb-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        <p
          className="text-xs uppercase tracking-[0.3em] mb-3"
          style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-mono)' }}
        >
          Your memories
        </p>
        <h2
          className="font-light"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 8vw, 3.5rem)',
            letterSpacing: '-0.01em',
          }}
        >
          {event.guest_name}'s
          <br />
          <em>Birthday Night</em>
        </h2>
      </motion.div>

      {/* Contributors */}
      <motion.div
        className="flex flex-wrap justify-center gap-2 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        {contributors.map((name) => (
          <span
            key={name}
            className="text-xs px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(201,168,76,0.08)',
              border: '1px solid rgba(201,168,76,0.2)',
              color: 'rgba(201,168,76,0.8)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {name}
          </span>
        ))}
      </motion.div>

      {/* Masonry-style photo grid */}
      <div className="columns-2 gap-2 space-y-2">
        {photos.map((memory, i) => (
          <motion.div
            key={memory.id}
            className="break-inside-avoid rounded-2xl overflow-hidden cursor-pointer relative group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.06, duration: 0.7 }}
            onClick={() => onSelectMemory(memory)}
            whileTap={{ scale: 0.98 }}
          >
            <Image
              src={memory.storage_url}
              alt={`By ${memory.participant_name}`}
              width={400}
              height={400}
              className="w-full object-cover"
              style={{ display: 'block' }}
            />
            {/* Hover/tap overlay */}
            <div
              className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity duration-200"
              style={{
                background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.6))',
              }}
            >
              <div className="absolute bottom-3 left-3 right-3">
                <p
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)' }}
                >
                  {memory.participant_name}
                </p>
                {memory.whisper_message && (
                  <p
                    className="text-xs mt-0.5 truncate italic"
                    style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-display)' }}
                  >
                    "{memory.whisper_message}"
                  </p>
                )}
              </div>
            </div>

            {/* Whisper dot */}
            {memory.whisper_message && (
              <div
                className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'var(--color-gold)' }}
              >
                <span style={{ fontSize: '8px' }}>✍</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Videos section */}
      {videos.length > 0 && (
        <motion.div
          className="mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <p
            className="text-xs uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
          >
            Video memories
          </p>
          <div className="flex flex-col gap-3">
            {videos.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--color-surface)' }}
              >
                <video
                  src={v.storage_url}
                  controls
                  playsInline
                  className="w-full"
                  style={{ maxHeight: '280px', objectFit: 'cover' }}
                />
                <div className="px-4 py-3">
                  <p
                    className="text-xs"
                    style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    from {v.participant_name}
                  </p>
                  {v.whisper_message && (
                    <p
                      className="text-sm mt-1 italic"
                      style={{
                        color: 'var(--color-gold)',
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.05rem',
                        lineHeight: 1.5,
                      }}
                    >
                      "{v.whisper_message}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Ending message */}
      <motion.div
        className="mt-16 text-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1.5 }}
      >
        <div
          className="w-12 h-px mx-auto mb-8"
          style={{ background: 'rgba(201,168,76,0.3)' }}
        />
        <p
          className="font-light italic"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.3rem, 5vw, 1.8rem)',
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.6,
          }}
        >
          These moments were captured
          <br />
          because you're worth capturing.
        </p>
        <p
          className="mt-6 text-xs uppercase tracking-[0.3em]"
          style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-mono)' }}
        >
          Happy Birthday, {event.guest_name}.
        </p>
      </motion.div>
    </div>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

function Lightbox({ memory, onClose }: { memory: Memory; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(24px)' }}
      />

      <motion.div
        className="relative w-full max-w-sm"
        initial={{ scale: 0.88, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl overflow-hidden">
          <Image
            src={memory.storage_url}
            alt=""
            width={600}
            height={600}
            className="w-full object-contain"
            style={{ maxHeight: '70vh' }}
          />
        </div>

        <div className="mt-4 px-1">
          <p
            className="text-sm"
            style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}
          >
            from <span style={{ color: '#fff' }}>{memory.participant_name}</span>
          </p>
          {memory.whisper_message && (
            <motion.p
              className="mt-3 italic leading-relaxed"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                color: 'var(--color-gold)',
                lineHeight: 1.6,
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              "{memory.whisper_message}"
            </motion.p>
          )}
        </div>

        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-9 h-9 rounded-full flex items-center justify-center text-sm"
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          ✕
        </button>
      </motion.div>
    </motion.div>
  );
}
