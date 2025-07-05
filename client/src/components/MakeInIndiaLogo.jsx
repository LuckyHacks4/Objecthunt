import { motion } from "framer-motion";
import { useState } from "react";

const MakeInIndiaLogo = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="fixed bottom-4 right-4 z-50 cursor-pointer"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="bg-white/95 rounded-lg p-3 shadow-lg border-2 border-orange-500">
        <div className="flex flex-col items-center">
          {/* Animated Lion */}
          <motion.div
            className="text-4xl mb-2"
            animate={isHovered ? {
              x: [0, 10, 0],
              rotateY: [0, 180, 360],
            } : {}}
            transition={{
              duration: 2,
              repeat: isHovered ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            🦁
          </motion.div>
          
          {/* Make in India Text */}
          <div className="text-center">
            <motion.div
              className="text-xs font-bold text-orange-600"
              animate={isHovered ? {
                color: ["#FF6B35", "#FF8C42", "#FF6B35"]
              } : {}}
              transition={{
                duration: 1,
                repeat: isHovered ? Infinity : 0
              }}
            >
              MAKE IN INDIA
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MakeInIndiaLogo; 