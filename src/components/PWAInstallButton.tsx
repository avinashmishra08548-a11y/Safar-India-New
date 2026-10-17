import React, { useState } from 'react';
import { Smartphone, Download, Share, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable && install) {
      const accepted = await install();
      if (!accepted) {
        setShowInstallModal(true);
      }
      return;
    }
    setShowInstallModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-extrabold text-slate-950 bg-[#FFCC00] hover:bg-[#f5c400] rounded-full transition-all shadow-sm active:scale-95 whitespace-nowrap shrink-0 ${className}`}
        title="Install SafarIndiaCabs App"
      >
        <Download className="w-3.5 h-3.5 text-slate-950 stroke-[2.5] shrink-0" />
        <span>Install App</span>
      </button>

      {showInstallModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FFCC00] flex items-center justify-center text-slate-950 font-black shadow-sm">
                  <Smartphone className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">SafarIndiaCabs App</h3>
                  <p className="text-xs text-slate-500">Fast 1-Tap Outstation & Local Booking</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isInstalled ? (
              <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">App is Ready & Active!</div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    You are already using the SafarIndiaCabs mobile app experience.
                  </div>
                </div>
              </div>
            ) : isIOS ? (
              <div className="mt-4 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-[#FFCC00] text-slate-950 font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Tap the <Share className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> <strong>Share</strong> button in your browser toolbar.</span>
                </div>
                <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-[#FFCC00] text-slate-950 font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Scroll down and select <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-[#FFCC00] text-slate-950 font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                  <span>Tap <strong>Add</strong> in the top right corner to launch SafarIndiaCabs anytime!</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-[#FFCC00] text-slate-950 font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Tap the browser menu <strong>(⋮)</strong> in the top-right corner of Chrome.</span>
                </div>
                <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-[#FFCC00] text-slate-950 font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Select <strong>Install App</strong> or <strong>Add to Home screen</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-[#FFCC00] text-slate-950 font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                  <span>Confirm to add the <strong>SafarIndiaCabs</strong> icon directly to your phone!</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="mt-5 w-full rounded-2xl bg-slate-950 py-3 text-xs font-extrabold text-white hover:bg-slate-800 transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
