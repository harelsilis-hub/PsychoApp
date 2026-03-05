import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';

const InstallPWA = () => {
  const [installPrompt, setInstallPrompt] = useState(null);  // Android/Chrome
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  useEffect(() => {
    // Already running as installed app — hide button
    if (isStandalone) return;

    // Already installed previously — hide button
    if (localStorage.getItem('pwa-installed')) return;

    // Android/Chrome: capture the install prompt
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS: show button manually since beforeinstallprompt doesn't fire
    if (isIOS) setIsVisible(true);

    // Hide after user installs
    window.addEventListener('appinstalled', () => {
      localStorage.setItem('pwa-installed', '1');
      setIsVisible(false);
      setIsInstalled(true);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('pwa-installed', '1');
      setIsVisible(false);
    }
  };

  if (!isVisible || isInstalled) return null;

  return (
    <>
      {/* Floating install button */}
      <AnimatePresence>
        <motion.button
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 2 }}
          onClick={handleInstall}
          className="fixed bottom-4 right-4 z-50
                     flex items-center gap-2 px-4 py-2.5 rounded-2xl
                     bg-gradient-to-r from-violet-600 to-indigo-600
                     text-white font-bold text-xs shadow-xl shadow-indigo-300/50
                     hover:shadow-2xl active:scale-95 transition-all duration-200"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          התקן
        </motion.button>
      </AnimatePresence>

      {/* iOS instructions modal */}
      <AnimatePresence>
        {showIOSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-4"
            onClick={() => setShowIOSModal(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-right"
            >
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setShowIOSModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-black text-gray-900">התקנה על האייפון</h2>
              </div>

              <p className="text-sm text-gray-500 mb-5">בצע את השלבים הבאים בספארי:</p>

              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <span className="text-violet-600 font-black text-sm">1</span>
                  </div>
                  <div className="text-sm text-gray-700">
                    לחץ על כפתור השיתוף{' '}
                    <span className="inline-flex items-center gap-0.5 bg-gray-100 rounded px-1.5 py-0.5">
                      <Share className="w-3.5 h-3.5" />
                    </span>
                    {' '}בתחתית המסך
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <span className="text-violet-600 font-black text-sm">2</span>
                  </div>
                  <p className="text-sm text-gray-700">גלול למטה ולחץ על <strong>"הוסף למסך הבית"</strong></p>
                </div>

                <div className="flex items-center gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <span className="text-violet-600 font-black text-sm">3</span>
                  </div>
                  <p className="text-sm text-gray-700">לחץ <strong>"הוסף"</strong> בפינה הימנית העליונה</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600
                           text-white font-bold text-sm shadow-md"
              >
                הבנתי
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallPWA;
