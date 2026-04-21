import { v4 as uuidv4 } from 'uuid';

export function generateSlug(guestName: string): string {
  const clean = guestName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const short = uuidv4().replace(/-/g, '').slice(0, 6);
  return `${clean}-${short}`;
}

export function getParticipantSession(eventSlug: string): {
  participantId: string;
  participantName: string;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = `midnight_participant_${eventSlug}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setParticipantSession(
  eventSlug: string,
  participantId: string,
  participantName: string
): void {
  if (typeof window === 'undefined') return;
  const key = `midnight_participant_${eventSlug}`;
  localStorage.setItem(key, JSON.stringify({ participantId, participantName }));
}

export function getShotCount(eventSlug: string): number {
  if (typeof window === 'undefined') return 0;
  const key = `midnight_shots_${eventSlug}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

export function incrementShotCount(eventSlug: string): void {
  if (typeof window === 'undefined') return;
  const key = `midnight_shots_${eventSlug}`;
  const current = getShotCount(eventSlug);
  localStorage.setItem(key, String(current + 1));
}

export function getHostSession(eventSlug: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`midnight_host_${eventSlug}`) === 'true';
}

export function setHostSession(eventSlug: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`midnight_host_${eventSlug}`, 'true');
}

export const MAX_PHOTOS = 15;
export const MAX_VIDEO_SECONDS = 30;
