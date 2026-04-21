'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, type Event, type Memory, type Participant } from '@/lib/supabase';
import { getParticipantSession, getHostSession } from '@/lib/utils';
import Image from 'next/image';

export default function VaultPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const isHostParam = searchParams.get('host') === 'true';

  const [event, setEvent] = useState<Event | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shareText, setShareText] = useState('Share Link');
  const [unlocking, setUnlocking] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  const fetchData = useCallback(async () => {
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single();

    if (eventData) {
      setEvent(eventData);

      if (eventData.reveal_unlocked) {
        router.replace(`/event/${slug}/reveal`);
        return;
      }
    }

    const { data: memoriesData } = await supabase
      .from('memories')
      .select('*')
      .eq('event_id', eventData?.id)
      .order('created_at', { ascending: false });

    const { data: participantsData } = await supabase
      .from('participants')
      .select('*')
      .eq('event_id', eventData?.id)
      .order('joined_at', { ascending: true });

    setMemories(memoriesData || []);
    setParticipants(participantsData || []);
    setLoading(false);
  }, [slug, router]);

  useEffect(() => {
    const hostSession = getHostSession(slug) || isHostParam;
    setIsHost(hostSession);

    const participantSession = getParticipantSession(slug);
    if (!hostSession && !participantSession) {
      router.replace(`/event/${slug}/join`);
      return;
    }

    fetchData();

    // Realtime updates
    const channel = supabase
      .channel(`vault-${slug}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'memories' },
        () => fetchData()
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'participants' },
        () => fetchData()
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' },
        (payload) => {
          if (payload.new.reveal_unlocked) {
            router.push(`/event/${slug}/reveal`);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [slug, router, isHostParam, fetchData]);

  async function handleUnlock() {
    if (!event || !isHost) return;
    setUnlocking(true);

    await supabase
      .from('events')
      .update({ reveal_unlocked: true })
      .eq('id', event.id);

    router.push(`/event/${slug}/reveal`);
  }

  function handleShare() {
    const url = `${window.location.origin}/event/${slug}/join`;
    if (navigator.share) {
      navigator.share({
        title: `${event?.guest_name}'s Birthday`,
        text: `Join tonight's memory experience for ${event?.guest_name}`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      setShareText('Copied!');
      setTimeout(() => setShareText('Share Link'), 2000);
    }
  }

  const photos = memories.filter(m => m.type === 'photo');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div
          className="w-6 h-6 rounded-full border border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-gold)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh safe-top">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="flex items-center justify-between mb-1">
            <p
              className="text-xs uppercase tracking-[0.25em]"
              style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-mono)' }}
            >
              {isHost ? 'Host view' : 'Memory vault'}
            </p>

            {/* Live pill */}
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#4ade80' }}
              />
              <span
                className="text-xs"
                style={{ color: 'rgba(74, 222, 128, 0.8)', fontFamily: 'var(--font-mono)' }}
              >
                {participants.length} joined
              </span>
            </div>
          </div>

          <h1
            className="text-3xl font-light"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {event?.guest_name}'s Night
          </h1>
        </motion.div>
      </div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="px-6 mb-6"
      >
        <div
          className="flex items-center justify-between rounded-2xl px-5 py-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="text-center">
            <p
              className="text-2xl font-light mb-0.5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {photos.length}
            </p>
            <p
              className="text-xs uppercase tracking-widest"
              style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
            >
              Photos
            </p>
          </div>
          <div
            className="w-px h-8"
            style={{ background: 'var(--color-border)' }}
          />
          <div className="text-center">
            <p
              className="text-2xl font-light mb-0.5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {memories.filter(m => m.type === 'video').length}
            </p>
            <p
              className="text-xs uppercase tracking-widest"
              style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
            >
              Videos
            </p>
          </div>
          <div
            className="w-px h-8"
            style={{ background: 'var(--color-border)' }}
          />
          <div className="text-center">
            <p
              className="text-2xl font-light mb-0.5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {memories.filter(m => m.whisper_message).length}
            </p>
            <p
              className="text-xs uppercase tracking-widest"
              style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
            >
              Whispers
            </p>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="px-6 mb-6 flex gap-3">
        <button onClick={handleShare} className="btn-ghost flex-1 text-sm">
          {shareText}
        </button>
        {!isHost && (
          <button
            onClick={() => router.push(`/event/${slug}/camera`)}
            className="btn-primary flex-1 text-sm"
          >
            Open Camera
          </button>
        )}
      </div>

      {/* Participants */}
      {participants.length > 0 && (
        <div className="px-6 mb-6">
          <p
            className="text-xs uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
          >
            Here tonight
          </p>
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <div
                key={p.id}
                className="px-3 py-1.5 rounded-full text-sm"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {p.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo grid */}
      <div className="px-6 flex-1">
        <p
          className="text-xs uppercase tracking-widest mb-4"
          style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
        >
          Captured tonight
        </p>

        {memories.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ border: '1px dashed var(--color-border)' }}
          >
            <p
              className="text-4xl mb-3"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dim)' }}
            >
              Waiting for
              <br />
              <em>the first memory</em>
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Share the link. The vault will fill itself.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 pb-8">
            {memories.map((memory, i) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="aspect-square relative rounded-xl overflow-hidden cursor-pointer"
                onClick={() => setSelectedMemory(memory)}
                style={{ background: 'var(--color-surface)' }}
              >
                {memory.type === 'photo' ? (
                  <Image
                    src={memory.storage_url}
                    alt={`By ${memory.participant_name}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 33vw, 200px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <span className="text-2xl">▶</span>
                  </div>
                )}

                {/* Contributor tag */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-2 py-1"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                  }}
                >
                  <p
                    className="text-xs truncate"
                    style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)' }}
                  >
                    {memory.participant_name}
                  </p>
                </div>

                {/* Whisper indicator */}
                {memory.whisper_message && (
                  <div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                    style={{ background: 'rgba(201,168,76,0.9)' }}
                  >
                    ✍
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Host unlock button */}
      {isHost && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="sticky bottom-0 px-6 pb-8 pt-4"
          style={{ background: 'linear-gradient(to top, var(--color-bg) 60%, transparent)' }}
        >
          <button
            onClick={handleUnlock}
            disabled={unlocking || memories.length === 0}
            className="btn-primary w-full py-4 text-sm disabled:opacity-30"
          >
            {unlocking ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border border-black/30 border-t-black rounded-full animate-spin" />
                Unlocking...
              </span>
            ) : (
              <>🌙 Unlock the Reveal for {event?.guest_name}</>
            )}
          </button>
          {memories.length === 0 && (
            <p
              className="text-xs text-center mt-2"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Waiting for at least one memory...
            </p>
          )}
        </motion.div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMemory(null)}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}
            />
            <motion.div
              className="relative max-w-sm w-full mx-6"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-2xl overflow-hidden">
                {selectedMemory.type === 'photo' ? (
                  <Image
                    src={selectedMemory.storage_url}
                    alt=""
                    width={400}
                    height={400}
                    className="w-full object-contain"
                  />
                ) : (
                  <video
                    src={selectedMemory.storage_url}
                    controls
                    autoPlay
                    className="w-full"
                  />
                )}
              </div>
              <div className="mt-3 px-1">
                <p
                  className="text-sm font-light"
                  style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-body)' }}
                >
                  by <span style={{ color: '#fff' }}>{selectedMemory.participant_name}</span>
                </p>
                {selectedMemory.whisper_message && (
                  <p
                    className="text-sm mt-2 italic"
                    style={{
                      color: 'var(--color-gold)',
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.1rem',
                      lineHeight: 1.6,
                    }}
                  >
                    "{selectedMemory.whisper_message}"
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
