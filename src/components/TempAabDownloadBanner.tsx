import React, { useState } from 'react';
import { CheckCircle2, Download, Loader2, ShieldCheck } from 'lucide-react';

const AAB_URL = '/com.safarindiacabs.app-release.aab';
const AAB_FILENAME = 'com.safarindiacabs.app-v1.1.0-vc10-release.aab';

/**
 * Temporary direct Play Store AAB download bar at the top of the website.
 * Remove this component when the user confirms the file has been uploaded to Play Console.
 */
export const TempAabDownloadBanner: React.FC = () => {
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'done' | 'error'>('idle');
  const [errorNote, setErrorNote] = useState<string>('');

  const handleDirectDownload = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (downloadState === 'downloading') return;

    setDownloadState('downloading');
    setErrorNote('');

    try {
      const response = await fetch(`${AAB_URL}?v=10&t=${Date.now()}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      // Verify ZIP/AAB binary signature ("PK" = 0x50 0x4B) so HTML fallback is never saved as .aab
      const headerBytes = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
      const isValidZipBundle =
        blob.size > 1000000 && headerBytes[0] === 0x50 && headerBytes[1] === 0x4b;

      if (!isValidZipBundle) {
        throw new Error('Invalid bundle response');
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = AAB_FILENAME;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);

      setDownloadState('done');
      window.setTimeout(() => setDownloadState('idle'), 5000);
    } catch {
      // Fallback to native browser direct download link
      const fallbackLink = document.createElement('a');
      fallbackLink.href = AAB_URL;
      fallbackLink.download = AAB_FILENAME;
      fallbackLink.rel = 'noopener';
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      document.body.removeChild(fallbackLink);
      setDownloadState('error');
      setErrorNote('Direct browser download triggered.');
    }
  };

  return (
    <div
      role="region"
      aria-label="Direct Play Store AAB Download"
      className="w-full bg-gradient-to-r from-[#0B1324] via-[#13203A] to-[#0B1324] text-white border-b-2 border-amber-400 px-3 sm:px-6 py-2.5 z-[110]"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Play Store Release Ready · v1.1.0 (Version Code 10)</span>
          </div>
          <div className="text-[11px] sm:text-xs text-slate-200 mt-0.5 leading-snug">
            Signed Full-Asset AAB (<span className="font-mono text-amber-200">3.9 MB</span>) ·{' '}
            <span className="font-mono text-slate-300">com.safarindiacabs.app</span>
            {errorNote ? <span className="ml-2 text-amber-300">{errorNote}</span> : null}
          </div>
        </div>

        <a
          href={AAB_URL}
          download={AAB_FILENAME}
          onClick={handleDirectDownload}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md shrink-0 cursor-pointer"
        >
          {downloadState === 'downloading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Downloading AAB...</span>
            </>
          ) : downloadState === 'done' ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Downloaded (.aab Ready)</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 shrink-0" />
              <span>Download Signed .AAB (3.9 MB)</span>
            </>
          )}
        </a>
      </div>
    </div>
  );
};
