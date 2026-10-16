import React from 'react';
import { X, Mail, MessageSquare } from 'lucide-react';
import { playTempleBell } from '../utils/audio';

interface ArjunPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArjunPosterModal: React.FC<ArjunPosterModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const contacts = [
    {
      display: '+91 7571991816',
      raw: '7571991816',
      waUrl: 'https://wa.me/917571991816?text=Namaste%20Arjun%20ji',
    },
    {
      display: '+91 9532476007',
      raw: '9532476007',
      waUrl: 'https://wa.me/919532476007?text=Namaste%20Arjun%20ji',
    },
  ];

  const email = 'kushwahaarjun9970@gmail.com';

  return (
    <div
      className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in text-slate-800"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-gradient-to-b from-[#2a0404] via-[#1a0202] to-[#250303] border-2 border-[#d9a441] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden relative text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sacred Ornamental Golden Border Accent */}
        <div className="h-1.5 bg-gradient-to-r from-[#ffd76a] via-[#e5a93b] to-[#ffd76a]" />

        {/* Close Button */}
        <button
          onClick={() => {
            playTempleBell();
            onClose();
          }}
          className="absolute top-3.5 right-3.5 p-2 rounded-full bg-black/50 hover:bg-black/80 text-[#ffd76a] hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 flex flex-col items-center text-center">
          {/* Developer Photo */}
          <div className="relative my-2">
            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-[#ffd76a] via-[#d9a441] to-[#781010] shadow-[0_0_25px_rgba(217,164,65,0.45)]">
              <img
                src="/images/arjun_avatar.webp"
                alt="Arjun Kushwaha"
                className="w-full h-full rounded-full object-cover shadow-inner"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.triedJpg) {
                    target.dataset.triedJpg = '1';
                    target.src = '/images/arjun_avatar.jpg';
                  } else {
                    target.src = '/images/arjun_avatar_1790242444969.jpg';
                  }
                }}
              />
            </div>
          </div>

          {/* Developer Name & Role */}
          <h2 className="font-marcellus text-2xl font-bold tracking-wide gold-gradient-text mt-2">
            Arjun Kushwaha
          </h2>
          <p className="text-xs text-[#ffd76a] font-medium tracking-wider uppercase mt-0.5">
            Website Developer
          </p>

          <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-[#ffd76a]/60 to-transparent my-4" />

          {/* Contact Numbers (Direct Click -> WhatsApp) */}
          <div className="w-full space-y-2.5 mb-3">
            {contacts.map((contact) => (
              <a
                key={contact.raw}
                href={contact.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playTempleBell()}
                className="w-full p-3.5 rounded-2xl bg-[#350505]/95 border border-[#d9a441]/40 hover:border-emerald-400 hover:bg-[#3d0808] transition-all flex items-center gap-3.5 shadow-md hover:shadow-[0_0_18px_rgba(16,185,129,0.3)] group cursor-pointer"
                title="Click for Direct WhatsApp Chat"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600/25 border border-emerald-500/60 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <span className="block text-base font-bold font-mono text-[#fff7e6] group-hover:text-[#ffd76a] transition-colors tracking-wide">
                    {contact.display}
                  </span>
                  <span className="block text-[11px] text-emerald-400 font-medium">
                    WhatsApp पर संदेश भेजें
                  </span>
                </div>
              </a>
            ))}
          </div>

          {/* Gmail Link */}
          <a
            href={`mailto:${email}?subject=Regarding%20Website`}
            onClick={() => playTempleBell()}
            className="w-full p-3.5 rounded-2xl bg-[#350505]/95 border border-[#d9a441]/40 hover:border-red-400 hover:bg-[#3d0808] transition-all flex items-center gap-3.5 shadow-md hover:shadow-[0_0_18px_rgba(239,68,68,0.25)] group cursor-pointer"
            title="Click to send Email"
          >
            <div className="w-10 h-10 rounded-xl bg-red-600/25 border border-red-500/60 flex items-center justify-center text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <span className="block text-xs sm:text-sm font-semibold font-mono text-[#fff7e6] group-hover:text-[#ffd76a] transition-colors truncate">
                {email}
              </span>
              <span className="block text-[11px] text-red-400 font-medium">
                Gmail (ईमेल भेजें)
              </span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};
