import React, { useState, useRef, useEffect } from 'react';
import { Video, Image as ImageIcon, Flame, Volume2, VolumeX, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { FeaturedMedia } from '../data/pandalData';
import { playTempleBell } from '../utils/audio';

interface FeaturedMediaSectionProps {
  media?: FeaturedMedia;
}

/**
 * Transforms standard YouTube links to embed URLs with autoplay
 */
function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11
    ? `https://www.youtube-nocookie.com/embed/${match[2]}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${match[2]}`
    : null;
}

export const FeaturedMediaSection: React.FC<FeaturedMediaSectionProps> = ({ media }) => {
  // CRITICAL REQUIREMENT: If disabled, empty, or removed, return null so zero space is left!
  if (!media || !media.enabled || !media.url || !media.url.trim()) {
    return null;
  }

  const cleanUrl = media.url.trim();
  const isVideo = media.type === 'video';
  const youtubeEmbed = isVideo ? getYouTubeEmbedUrl(cleanUrl) : null;

  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Ensure video autoplays and loads immediately upon site mount
  useEffect(() => {
    if (videoRef.current && isVideo && !youtubeEmbed) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay note (browser policy):', err);
        });
      }
    }
  }, [cleanUrl, isVideo, youtubeEmbed]);

  const toggleSound = () => {
    playTempleBell();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  return (
    <section className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#2e0505] via-[#1a0202] to-[#120101] border border-[#d9a441]/40 shadow-[0_10px_35px_rgba(0,0,0,0.65)] p-3 sm:p-5">
        {/* Subtle Golden Ambient Radiance */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#d9a441]/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header Badge & Action Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#ffd76a]/15 text-[#ffd76a] border border-[#d9a441]/35 shadow-xs shrink-0">
              {isVideo ? <Video className="w-4 h-4 text-amber-400" /> : <ImageIcon className="w-4 h-4 text-[#ffd76a]" />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#ffd76a] flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" />
                  {isVideo ? 'विशेष वीडियो दर्शन (Live / Video)' : 'विशेष मुख्य आकर्षण (Highlight)'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-red-600 to-amber-600 text-white animate-pulse shadow-xs">
                  FEATURED
                </span>
              </div>
              {media.title && (
                <h3 className="font-marcellus text-base sm:text-lg font-bold text-[#fff4d1] mt-0.5 leading-tight">
                  {media.title}
                </h3>
              )}
            </div>
          </div>

          {/* Attached Link Button (if configured) */}
          {media.linkUrl && media.linkUrl.trim() && (
            <a
              href={media.linkUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playTempleBell()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ffd76a] via-[#e5b842] to-[#d9a441] text-[#2a0404] hover:brightness-105 active:scale-95 font-bold text-xs shadow-md transition-all cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>{media.linkText || 'लिंक खोलें (Open Link)'}</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
            </a>
          )}
        </div>

        {/* Media Canvas - Maintains Native Aspect Ratio */}
        <div className="relative w-full rounded-2xl overflow-hidden bg-black/90 border border-[#d9a441]/30 shadow-2xl flex items-center justify-center">
          {isVideo ? (
            youtubeEmbed ? (
              <div className="relative w-full aspect-video">
                <iframe
                  className="absolute inset-0 w-full h-full rounded-2xl"
                  src={youtubeEmbed}
                  title={media.title || 'Pandal Featured Video'}
                  loading="eager"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="relative w-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={cleanUrl}
                  autoPlay
                  muted={isMuted}
                  loop
                  playsInline
                  preload="auto"
                  controls
                  className="w-full h-auto max-h-[82vh] rounded-2xl object-contain mx-auto shadow-2xl block bg-black"
                >
                  आपका ब्राउज़र इस वीडियो को सीधे चलाने में असमर्थ है।
                </video>

                {/* Floating Sound Toggle Button */}
                <button
                  type="button"
                  onClick={toggleSound}
                  className="absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/90 text-[#ffd76a] border border-[#ffd76a]/40 text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                  title={isMuted ? 'ध्वनि चालू करें (Unmute)' : 'ध्वनि बंद करें (Mute)'}
                >
                  {isMuted ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-[11px]">Unmute 🔊</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px]">Mute 🔇</span>
                    </>
                  )}
                </button>
              </div>
            )
          ) : (
            <div className="relative w-full flex items-center justify-center">
              <img
                src={cleanUrl}
                alt={media.title || 'Featured Pandal Media'}
                loading="eager"
                decoding="async"
                className="w-full h-auto max-h-[82vh] object-contain rounded-2xl transition-transform hover:scale-[1.01] duration-300 mx-auto block"
              />
            </div>
          )}
        </div>

        {/* Optional Subtitle / Devotional Note & Bottom Link */}
        <div className="mt-3 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {media.subtitle ? (
            <p className="text-xs sm:text-sm text-[#f3e3be]/90 font-serif leading-relaxed">
              {media.subtitle}
            </p>
          ) : (
            <div />
          )}

          {media.linkUrl && media.linkUrl.trim() && (
            <a
              href={media.linkUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#ffd76a] hover:underline flex items-center gap-1 shrink-0 font-medium"
            >
              <span>{media.linkText || '🔗 संबंधित लिंक पर जाएं'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
};
