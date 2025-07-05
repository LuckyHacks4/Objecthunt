import { motion, AnimatePresence } from "framer-motion";

const TermsOfService = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            className="bg-white/95 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-orange-500 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-3xl font-bold text-orange-600 mb-2"
              >
                📜 Terms of Service & License Agreement
              </motion.h2>
              <motion.p
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-gray-600"
              >
                Object Hunt Game - Copyright © 2024. All rights reserved.
              </motion.p>
            </div>

            {/* Content */}
            <div className="space-y-6 text-sm leading-relaxed">
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h3 className="font-bold text-orange-700 mb-2">⚠️ IMPORTANT NOTICE</h3>
                <p className="text-orange-600">
                  This game is protected by copyright law. Unauthorized copying, distribution, or commercial use is strictly prohibited and will result in legal action.
                </p>
              </div>

              <section>
                <h3 className="font-bold text-lg text-orange-600 mb-3">🎮 Permitted Use</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Personal, non-commercial entertainment use only</li>
                  <li>Educational use with prior written consent</li>
                  <li>Non-profit use with prior written consent</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg text-red-600 mb-3">🚫 Strictly Prohibited</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Copying, reproducing, or distributing the game</li>
                  <li>Creating derivative works or similar games</li>
                  <li>Commercial use without written permission</li>
                  <li>Removing copyright or attribution notices</li>
                  <li>Reverse engineering or decompiling</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg text-blue-600 mb-3">💰 Commercial Use & Revenue Sharing</h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-blue-700 mb-3">
                    <strong>For YouTubers, Influencers, and Content Creators:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-blue-600">
                    <li>You MUST contact us before creating any content featuring this game</li>
                    <li>50% revenue sharing agreement required</li>
                    <li>All ad revenue, sponsorships, and income must be shared</li>
                    <li>Proper attribution and links required</li>
                    <li>Failure to comply = immediate legal action</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="font-bold text-lg text-purple-600 mb-3">📧 Contact Information</h3>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-purple-700 mb-2">
                    <strong>For licensing inquiries and commercial use requests:</strong>
                  </p>
                  <ul className="text-purple-600 space-y-1">
                    <li>📧 Email: licensing@objecthunt.com</li>
                    <li>🌐 Website: https://www.objecthunt.com</li>
                    <li>📝 All requests must be submitted in writing</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="font-bold text-lg text-gray-700 mb-3">⚖️ Legal Enforcement</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Violations will result in immediate legal action</li>
                  <li>Injunctive relief and monetary damages may be sought</li>
                  <li>Violators responsible for all legal fees and costs</li>
                  <li>International copyright protection applies</li>
                </ul>
              </section>

              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-600 text-xs">
                  By using Object Hunt, you acknowledge that you have read, understood, and agree to be bound by these terms. 
                  This license is legally binding and enforceable in all jurisdictions.
                </p>
              </div>
            </div>

            {/* Close Button */}
            <div className="text-center mt-8">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold transition-colors"
              >
                I Understand - Close
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TermsOfService; 