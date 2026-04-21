'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getParticipantSession, getHostSession } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function EventIndexPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  useEffect(() => {
    async function redirect() {
      // Check reveal status first
      const { data: eventData } = await supabase
        .from('events')
        .select('reveal_unlocked')
        .eq('slug', slug)
        .single();

      if (eventData?.reveal_unlocked) {
        router.replace(`/event/${slug}/reveal`);
        return;
      }

      // Check host
      if (getHostSession(slug)) {
        router.replace(`/event/${slug}/vault?host=true`);
        return;
      }

      // Check participant
      const session = getParticipantSession(slug);
      if (session) {
        router.replace(`/event/${slug}/camera`);
        return;
      }

      // New visitor → join
      router.replace(`/event/${slug}/join`);
    }

    redirect();
  }, [slug, router]);

  return (
    <div className="flex items-center justify-center min-h-dvh">
      <div
        className="w-5 h-5 rounded-full border border-t-transparent animate-spin"
        style={{ borderColor: 'var(--color-gold)', borderTopColor: 'transparent' }}
      />
    </div>
  );
}
