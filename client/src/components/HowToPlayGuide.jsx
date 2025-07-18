import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const HowToPlayGuide = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "🎯 Step 1: Join or Create a Room",
      content: "Start by creating a new room or joining an existing one with your friends. Think of it as your secret hideout for the ultimate object hunt!",
      emoji: "🏠",
      animation: "bounce"
    },
    {
      title: "📸 Step 2: Get Ready to Hunt",
      content: "Once everyone's ready, you'll get a word like 'spoon' or 'book'. Your mission: find that object and snap a photo faster than your friends!",
      emoji: "🔍",
      animation: "pulse"
    },
    {
      title: "⏰ Step 3: Race Against Time",
      content: "You have a limited time to find and photograph the object. The faster you are, the more points you get! Speed is your friend here.",
      emoji: "⚡",
      animation: "shake"
    },
    {
      title: "🗳️ Step 4: Vote on Photos",
      content: "After everyone submits their photos, vote on whether each photo actually shows the correct object. Be honest, but also be strategic!",
      emoji: "✅",
      animation: "tada"
    },
    {
      title: "🏆 Step 5: Win the Game",
      content: "Play multiple rounds and the player with the most points wins! Remember: speed + accuracy = victory!",
      emoji: "🎉",
      animation: "wobble"
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCurrentStep(0);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      setCurrentStep(steps.length - 1);
    }
  };

  const getAnimationVariants = (animation) => {
    switch (animation) {
      case "bounce":
        return {
          animate: { y: [0, -10, 0] },
          transition: { duration: 0.6, repeat: Infinity }
        };
      case "pulse":
        return {
          animate: { scale: [1, 1.1, 1] },
          transition: { duration: 1, repeat: Infinity }
        };
      case "shake":
        return {
          animate: { x: [0, -5, 5, -5, 0] },
          transition: { duration: 0.5, repeat: Infinity }
        };
      case "tada":
        return {
          animate: { 
            scale: [1, 1.1, 0.9, 1.1, 1],
            rotate: [0, -3, 3, -3, 0]
          },
          transition: { duration: 0.8, repeat: Infinity }
        };
      case "wobble":
        return {
          animate: { 
            rotate: [0, -5, 5, -5, 0],
            scale: [1, 1.05, 1]
          },
          transition: { duration: 1, repeat: Infinity }
        };
      default:
        return {};
    }
  };

  

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            className="bg-white/95 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-orange-500 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-3xl font-bold text-orange-600 mb-2"
              >
                🎮 How to Play Object Hunt! 🎮
              </motion.h2>
              <motion.p
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-gray-600"
              >
                The ultimate photo scavenger hunt game!
              </motion.p>
            </div>

            {/* Current Step */}
            <motion.div
              key={currentStep}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="text-center mb-6"
            >
              <motion.div
                className="text-6xl mb-4"
                {...getAnimationVariants(steps[currentStep].animation)}
              >
                {steps[currentStep].emoji}
              </motion.div>
              
              <h3 className="text-xl font-bold text-orange-600 mb-3">
                {steps[currentStep].title}
              </h3>
              
              <p className="text-gray-700 text-lg leading-relaxed">
                {steps[currentStep].content}
              </p>
            </motion.div>



            {/* Progress Dots */}
            <div className="flex justify-center space-x-2 mb-6">
              {steps.map((_, index) => (
                <motion.div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index === currentStep ? 'bg-orange-500' : 'bg-gray-300'
                  }`}
                  whileHover={{ scale: 1.2 }}
                  onClick={() => setCurrentStep(index)}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={prevStep}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-colors"
              >
                ← Previous
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-bold transition-colors"
              >
                Got it! 🎯
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={nextStep}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-colors"
              >
                Next →
              </motion.button>
            </div>

            {/* Fun Tips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 p-4 bg-orange-100 rounded-xl border border-orange-200"
            >
              <h4 className="font-bold text-orange-700 mb-2">💡 Pro Tips:</h4>
              <ul className="text-sm text-orange-600 space-y-1">
                <li>• Be creative with your photos - make them fun!</li>
                <li>• Vote fairly - karma is real in Object Hunt!</li>
                <li>• Use custom words to make the game more personal</li>
                <li>• Don't forget to take an avatar photo!</li>
              </ul>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HowToPlayGuide; 