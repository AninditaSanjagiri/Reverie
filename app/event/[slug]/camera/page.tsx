'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import { supabase, type Event } from '@/lib/supabase';
import {
  getParticipantSession,
  getShotCount,
  incrementShotCount,
  MAX_PHOTOS,
} from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

type CaptureMode = 'photo' | 'video';
type UploadState = 'idle' | 'uploading' | 'done' | 'error';

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  uploadState: UploadState;
}

export default function CameraPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [event, setEvent] = useState<Event | null>(null);
  const [session, setSession] = useState<{ participantId: string; participantName: string } | null>(null);
  const [shotCount, setShotCount] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);

  const [mode, setMode] = useState<CaptureMode>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [flash, setFlash] = useState(false);
  const [whisperOpen, setWhisperOpen] = useState(false);
  const [whisperText, setWhisperText] = useState('');
  const [whisperSaved, setWhisperSaved] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const [pendingUpload, setPendingUpload] = useState<{
    blob: Blob;
    type: 'photo' | 'video';
    photoId?: string;
  } | null>(null);

  useEffect(() => {
    const s = getParticipantSession(slug);
    if (!s) {
      router.replace(`/event/${slug}/join`);
      return;
    }
    setSession(s);

    const shots = getShotCount(slug);
    setShotCount(shots);

    const videoUsed = localStorage.getItem(`midnight_video_${slug}`) === 'true';
    setHasVideo(videoUsed);

    supabase.from('events').select('*').eq('slug', slug).single().then(({ data }) => {
      if (data) setEvent(data);
    });
  }, [slug, router]);

  // Handle pending upload
  useEffect(() => {
    if (!pendingUpload || !session) return;

    async function upload() {
      if (!pendingUpload || !session) return;

      const fileExt = pendingUpload.type === 'photo' ? 'jpg' : 'mp4';
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${slug}/${fileName}`;

      // Upload to storage
      const { error: storageError } = await supabase.storage
        .from('memories')
        .upload(filePath, pendingUpload.blob, {
          contentType: pendingUpload.type === 'photo' ? 'image/jpeg' : 'video/mp4',
        });

      if (storageError) {
        console.error('Upload error:', storageError);
        if (pendingUpload.photoId) {
          setCapturedPhotos(prev =>
            prev.map(p => p.id === pendingUpload.photoId ? { ...p, uploadState: 'error' } : p)
          );
        }
        setPendingUpload(null);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('memories')
        .getPublicUrl(filePath);

      // Save memory record
      await supabase.from('memories').insert({
        event_id: event?.id,
        participant_id: session.participantId,
        participant_name: session.participantName,
        type: pendingUpload.type,
        storage_url: urlData.publicUrl,
        whisper_message: whisperText.trim() || null,
      });

      if (pendingUpload.photoId) {
        setCapturedPhotos(prev =>
          prev.map(p => p.id === pendingUpload.photoId ? { ...p, uploadState: 'done' } : p)
        );
      }

      if (pendingUpload.type === 'video') {
        localStorage.setItem(`midnight_video_${slug}`, 'true');
        setHasVideo(true);
      }

      setPendingUpload(null);
    }

    upload();
  }, [pendingUpload, session, event, slug, whisperText]);

  const capturePhoto = useCallback(() => {
    if (shotCount >= MAX_PHOTOS || !webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    const photoId = uuidv4();
    const newPhoto: CapturedPhoto = {
      id: photoId,
      dataUrl: imageSrc,
      uploadState: 'uploading',
    };

    setCapturedPhotos(prev => [newPhoto, ...prev]);
    incrementShotCount(slug);
    setShotCount(prev => prev + 1);

    // Convert data URL to blob for upload
    fetch(imageSrc)
      .then(r => r.blob())
      .then(blob => {
        setPendingUpload({ blob, type: 'photo', photoId });
      });
  }, [shotCount, slug]);

  const startRecording = useCallback(() => {
    if (hasVideo || !webcamRef.current?.stream) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(webcamRef.current.stream, {
      mimeType: 'video/webm;codecs=vp9',
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
      setPendingUpload({ blob, type: 'video' });
      setIsRecording(false);
      setRecordingSeconds(0);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100);
    setIsRecording(true);

    // Auto-stop at 30 seconds
    const timer = setInterval(() => {
      setRecordingSeconds(s => {
        if (s >= 29) {
          clearInterval(timer);
          mediaRecorder.stop();
          return 30;
        }
        return s + 1;
      });
    }, 1000);
  }, [hasVideo]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const shotsLeft = MAX_PHOTOS - shotCount;
  const canCapture = mode === 'photo' ? shotsLeft > 0 : !hasVideo;

  return (
    <div className="relative flex flex-col min-h-dvh bg-black overflow-hidden">

      {/* Flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            className="fixed inset-0 bg-white z-50 pointer-events-none"
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>

      {/* Camera viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        <Webcam
          ref={webcamRef}
          audio={mode === 'video'}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.9}
          videoConstraints={{
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          }}
          onUserMedia={() => setCameraReady(true)}
          className="w-full h-full object-cover"
          style={{ minHeight: '60vh' }}
        />

        {/* Viewfinder overlay - cinematic crop lines */}
        {cameraReady && (
          <>
            {/* Corners */}
            {[
              'top-4 left-4 border-t border-l',
              'top-4 right-4 border-t border-r',
              'bottom-20 left-4 border-b border-l',
              'bottom-20 right-4 border-b border-r',
            ].map((cls, i) => (
              <div
                key={i}
                className={`absolute w-6 h-6 ${cls}`}
                style={{ borderColor: 'rgba(255,255,255,0.3)' }}
              />
            ))}
          </>
        )}

        {/* Recording indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,80,80,0.3)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#ff4444' }}
              />
              <span
                className="text-xs"
                style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}
              >
                {30 - recordingSeconds}s
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 safe-top px-4 pt-4 flex items-center justify-between">
          {/* Back to vault */}
          <button
            onClick={() => router.push(`/event/${slug}/vault`)}
            className="flex items-center justify-center w-10 h-10 rounded-full"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          >
            <span className="text-white text-sm">←</span>
          </button>

          {/* Shot counter */}
          <div
            className="px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
          >
            <span
              className="text-xs"
              style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.8)' }}
            >
              {String(shotsLeft).padStart(2, '0')} shots left
            </span>
          </div>

          {/* Flip camera */}
          <button
            onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
            className="flex items-center justify-center w-10 h-10 rounded-full text-white text-lg"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          >
            ⟳
          </button>
        </div>

        {/* Recent captures strip */}
        {capturedPhotos.length > 0 && (
          <div className="absolute bottom-4 left-4 flex gap-2">
            {capturedPhotos.slice(0, 3).map((photo) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-12 h-12 rounded-lg overflow-hidden"
                style={{ border: '1.5px solid rgba(255,255,255,0.25)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                {photo.uploadState === 'uploading' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div
                      className="w-3 h-3 border border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: 'rgba(255,255,255,0.6)', borderTopColor: 'transparent' }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className="safe-bottom px-6 pt-6 pb-8 flex flex-col gap-6"
        style={{ background: 'rgba(0,0,0,0.9)' }}
      >
        {/* Mode toggle */}
        <div className="flex justify-center">
          <div
            className="flex rounded-full p-1"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {(['photo', 'video'] as CaptureMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-5 py-2 rounded-full text-xs uppercase tracking-widest transition-all duration-300"
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: mode === m ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: mode === m ? '#fff' : 'rgba(255,255,255,0.4)',
                }}
              >
                {m === 'photo' ? `Photo` : `Video${hasVideo ? ' ✓' : ''}`}
              </button>
            ))}
          </div>
        </div>

        {/* Main controls row */}
        <div className="flex items-center justify-between px-4">
          {/* Whisper */}
          <button
            onClick={() => setWhisperOpen(true)}
            className="flex flex-col items-center gap-1"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: whisperSaved ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${whisperSaved ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              <span className="text-lg">{whisperSaved ? '💛' : '✍️'}</span>
            </div>
            <span
              className="text-xs"
              style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}
            >
              whisper
            </span>
          </button>

          {/* Shutter */}
          {mode === 'photo' ? (
            <motion.button
              onClick={capturePhoto}
              disabled={!canCapture || !cameraReady}
              whileTap={{ scale: 0.92 }}
              className="w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-30"
              style={{
                background: 'rgba(255,255,255,0.9)',
                boxShadow: '0 0 0 4px rgba(255,255,255,0.2)',
              }}
            >
              <div
                className="w-16 h-16 rounded-full"
                style={{ background: 'rgba(255,255,255,0.95)' }}
              />
            </motion.button>
          ) : (
            <motion.button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!canCapture || !cameraReady}
              whileTap={{ scale: 0.92 }}
              className="w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-30"
              style={{
                background: isRecording ? 'rgba(255,60,60,0.9)' : 'rgba(255,255,255,0.9)',
                boxShadow: `0 0 0 4px ${isRecording ? 'rgba(255,60,60,0.3)' : 'rgba(255,255,255,0.2)'}`,
              }}
            >
              {isRecording ? (
                <div className="w-7 h-7 rounded-sm bg-white" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-red-500" />
              )}
            </motion.button>
          )}

          {/* Gallery link */}
          <button
            onClick={() => router.push(`/event/${slug}/vault`)}
            className="flex flex-col items-center gap-1"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <span className="text-lg">🖼</span>
            </div>
            <span
              className="text-xs"
              style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}
            >
              vault
            </span>
          </button>
        </div>
      </div>

      {/* Whisper modal */}
      <AnimatePresence>
        {whisperOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
              onClick={() => setWhisperOpen(false)}
            />
            <motion.div
              className="relative w-full rounded-t-3xl p-6 safe-bottom"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            >
              <div
                className="w-10 h-1 rounded-full mx-auto mb-6"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              />
              <p
                className="text-xs uppercase tracking-widest mb-2"
                style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-mono)' }}
              >
                Whisper
              </p>
              <h3
                className="text-2xl font-light mb-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                A private note
              </h3>
              <p
                className="text-sm mb-5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {event?.guest_name} will see this alongside your photos at midnight.
              </p>
              <textarea
                value={whisperText}
                onChange={(e) => setWhisperText(e.target.value)}
                placeholder={`Something you'd tell ${event?.guest_name}...`}
                rows={4}
                maxLength={280}
                className="input-elegant resize-none mb-4"
                style={{ fontFamily: 'var(--font-body)', lineHeight: 1.6 }}
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span
                  className="text-xs"
                  style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
                >
                  {whisperText.length}/280
                </span>
                <button
                  onClick={() => {
                    setWhisperSaved(!!whisperText.trim());
                    setWhisperOpen(false);
                  }}
                  className="btn-primary py-3 px-6 text-sm"
                >
                  Save Whisper
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
