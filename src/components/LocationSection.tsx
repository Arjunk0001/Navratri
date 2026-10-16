import React, { useState } from 'react';
import { MapPin, Navigation, Copy, Check, Car, Phone, Compass, ExternalLink } from 'lucide-react';
import { PandalData } from '../data/pandalData';
import { playTempleBell } from '../utils/audio';

interface LocationSectionProps {
  data: PandalData;
}

export const LocationSection: React.FC<LocationSectionProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  // Dynamic Google Map Search Query built from pandal's current details
  const mapSearchQuery = (data.mapQuery && data.mapQuery.trim()) || [
    data.name,
    data.address,
    data.landmark,
    data.city || data.location,
  ].filter(Boolean).join(', ');

  const handleCopyAddress = () => {
    playTempleBell();
    const parts = [
      data.name,
      data.subName ? `(${data.subName})` : '',
      data.address,
      data.landmark ? `Landmark: ${data.landmark}` : '',
      data.city,
      data.pincode ? `- ${data.pincode}` : '',
      data.location && data.location !== data.city ? `(${data.location})` : '',
    ].filter(Boolean);
    const fullAddress = parts.join(', ');
    navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGetDirections = () => {
    playTempleBell();
    const destinationQuery = encodeURIComponent(mapSearchQuery);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}`, '_blank');
  };

  const handleOpenGoogleMaps = () => {
    playTempleBell();
    const query = encodeURIComponent(mapSearchQuery);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <section id="location-section" className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 scroll-mt-20">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-2">
        <span className="text-[#ffd76a]/60 text-sm hidden sm:inline">✤ ———</span>
        <span className="text-xl">📍</span>
        <h2 className="font-marcellus text-2xl sm:text-3xl font-bold tracking-wide gold-gradient-text text-center">
          Visit Our Pandal • पंडाल स्थान
        </h2>
        <span className="text-xl">📍</span>
        <span className="text-[#ffd76a]/60 text-sm hidden sm:inline">——— ✤</span>
      </div>

      <p className="text-center font-body text-xs sm:text-sm text-[#d4af37]/85 mb-6 max-w-xl mx-auto">
        Located at <strong className="text-[#ffd76a] font-semibold">{data.location || data.landmark || data.address || 'पंडाल परिसर'}</strong> with designated parking and senior citizen access gates.
      </p>

      {/* Main Location Card */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#3a0606] to-[#200202] border border-[#d9a441]/35 p-4 sm:p-7 shadow-2xl space-y-5">
        {/* Address Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-[#d9a441]/25">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#590a0a] border border-[#ffd76a]/50 text-[#ffd76a] shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {data.location && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#590a0a] border border-[#ffd76a]/40 text-[#ffd76a] text-[11px] font-bold">
                    📍 {data.location}
                  </span>
                )}
                {data.city && data.city !== data.location && (
                  <span className="px-2 py-0.5 rounded-full bg-black/40 border border-[#d9a441]/30 text-amber-200 text-[10px]">
                    {data.city}
                  </span>
                )}
              </div>
              <h3 className="font-marcellus text-base sm:text-lg font-bold text-[#fff7e6]">
                {data.address || data.location}
              </h3>
              <p className="font-body text-xs text-[#d9a441] mt-0.5">
                {data.landmark ? `Landmark: ${data.landmark}` : ''}
                {data.landmark && (data.city || data.pincode) ? ' • ' : ''}
                {data.city ? `${data.city}` : ''}
                {data.pincode ? ` (${data.pincode})` : ''}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleGetDirections}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-[#ffd76a] to-[#d9a441] hover:from-[#ffe082] text-[#2a0404] font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Get Directions</span>
            </button>

            <button
              onClick={handleCopyAddress}
              className="p-2 sm:px-3 sm:py-2 rounded-full bg-[#590a0a] hover:bg-[#781010] border border-[#ffd76a]/40 text-[#ffd76a] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copy Full Address"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Live Interactive Embedded Google Map */}
        <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-[#d9a441]/40 shadow-inner bg-[#160202]">
          <iframe
            title={`Live Google Map of ${data.name}`}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapSearchQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            className="w-full h-full border-0"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />

          {/* Floating Map Top Overlay */}
          <div className="absolute top-3 left-3 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#d9a441]/50 text-[11px] text-[#ffd76a] flex items-center gap-1.5 shadow-lg pointer-events-none">
            <MapPin className="w-3.5 h-3.5 text-red-400" />
            <span className="font-semibold line-clamp-1">{data.location || data.city || data.address || 'पंडाल लाइव लोकेशन'}</span>
          </div>

          {/* Floating Map Bottom External Button */}
          <div className="absolute bottom-3 right-3">
            <button
              onClick={handleOpenGoogleMaps}
              className="px-3.5 py-1.5 rounded-xl bg-black/85 hover:bg-black text-[#ffd76a] text-xs font-semibold border border-[#ffd76a]/60 shadow-lg flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm"
            >
              <span>Open in Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Gate & Logistics Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {/* Parking */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-[#d9a441]/20 space-y-1">
            <div className="flex items-center gap-2 text-[#ffd76a]">
              <Car className="w-4 h-4" />
              <h4 className="font-semibold text-xs uppercase tracking-wider">Gate 2 Parking</h4>
            </div>
            <p className="text-[11px] text-[#eedec5]">
              {data.parkingInfo.gate2Status}
            </p>
          </div>

          {/* Pedestrian Entry */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-[#d9a441]/20 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400">
              <Navigation className="w-4 h-4" />
              <h4 className="font-semibold text-xs uppercase tracking-wider">Gate 1 Entry</h4>
            </div>
            <p className="text-[11px] text-[#eedec5]">
              {data.parkingInfo.gate1Status}
            </p>
          </div>

          {/* Accessible / VIP */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-[#d9a441]/20 space-y-1">
            <div className="flex items-center gap-2 text-amber-300">
              <Compass className="w-4 h-4" />
              <h4 className="font-semibold text-xs uppercase tracking-wider">Gate 3 Special Access</h4>
            </div>
            <p className="text-[11px] text-[#eedec5]">
              {data.parkingInfo.gate3Status}
            </p>
          </div>

          {/* Emergency Helpline */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-[#d9a441]/20 space-y-1">
            <div className="flex items-center gap-2 text-rose-400">
              <Phone className="w-4 h-4" />
              <h4 className="font-semibold text-xs uppercase tracking-wider">24x7 Helpline</h4>
            </div>
            <p className="text-[11px] text-[#eedec5]">
              {data.parkingInfo.helpline}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
