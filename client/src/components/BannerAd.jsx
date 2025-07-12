import { useEffect, useState } from 'react';

const BannerAd = ({ position = 'top', className = '' }) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adData, setAdData] = useState(null);

  useEffect(() => {
    // Simulate ad loading with different content for different positions
    const timer = setTimeout(() => {
      const ads = {
        top: {
          title: "🎮 Play Object Hunt - Free Multiplayer Photo Scavenger Hunt Game! 🎮",
          bg: "bg-gradient-to-r from-blue-500 to-purple-600",
          cta: "Play Now!"
        },
        bottom: {
          title: "📸 Find Objects, Take Photos, Vote & Win! 📸",
          bg: "bg-gradient-to-r from-green-500 to-blue-600",
          cta: "Start Playing!"
        },
        sidebar: {
          title: "🎯 Object Hunt",
          subtitle: "Free Multiplayer Game",
          bg: "bg-gradient-to-b from-orange-400 to-red-500",
          cta: "Join Now!"
        }
      };
      
      setAdData(ads[position] || ads.top);
      setAdLoaded(true);
    }, 1000 + Math.random() * 2000); // Random delay to simulate real ad loading

    return () => clearTimeout(timer);
  }, [position]);

  // Different ad sizes based on position
  const getAdSize = () => {
    switch (position) {
      case 'top':
        return 'w-full h-16 md:h-20'; // Top banner
      case 'bottom':
        return 'w-full h-16 md:h-20'; // Bottom banner
      case 'sidebar':
        return 'w-48 h-96'; // Sidebar banner
      default:
        return 'w-full h-16 md:h-20';
    }
  };

  const handleAdClick = () => {
    // Simulate ad click tracking
    console.log(`Banner ad clicked: ${position} position`);
    
    // In a real implementation, this would track the click and redirect
    // For now, just log the click
    if (window.gtag) {
      window.gtag('event', 'ad_click', {
        'ad_position': position,
        'ad_type': 'banner'
      });
    }
  };

  if (!adLoaded) {
    return (
      <div className={`${getAdSize()} bg-gray-200 animate-pulse rounded-lg ${className}`}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-gray-400 text-sm">Loading Ad...</div>
        </div>
      </div>
    );
  }

  if (!adData) {
    return null;
  }

  return (
    <div 
      className={`${getAdSize()} rounded-lg shadow-lg overflow-hidden cursor-pointer transition-transform hover:scale-105 ${className}`}
      onClick={handleAdClick}
    >
      <div className={`${adData.bg} text-white text-center flex items-center justify-center h-full p-2`}>
        {position === 'sidebar' ? (
          <div className="flex flex-col items-center justify-center p-4">
            <span className="text-lg font-bold mb-2">{adData.title}</span>
            <span className="text-sm">{adData.subtitle}</span>
            <span className="text-xs mt-2">No Download Required</span>
            <button className="mt-3 bg-white text-orange-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              {adData.cta}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full px-4">
            <span className="text-sm md:text-base font-semibold flex-1">
              {adData.title}
            </span>
            <button className="bg-white text-blue-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-xs md:text-sm ml-4">
              {adData.cta}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerAd; 