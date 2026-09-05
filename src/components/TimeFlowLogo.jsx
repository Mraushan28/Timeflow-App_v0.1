import React, { useState } from 'react';
import { FiBarChart2 } from 'react-icons/fi';

/**
 * TimeFlow Brand Logo Component
 * Loads the transparent logo (/timeflow-logo.png with fallback to /logo.png) with object-fit: contain.
 * Gracefully falls back to the gradient icon if neither image file is available or if loading fails.
 */
export default function TimeFlowLogo({
  className = 'w-8 h-8',
  iconSize = 'w-4 h-4',
  alt = 'TimeFlow Logo',
}) {
  const [imgSrc, setImgSrc] = useState('/timeflow-logo.png');
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = () => {
    if (imgSrc === '/timeflow-logo.png') {
      setImgSrc('/logo.png');
    } else {
      setHasError(true);
    }
  };

  return (
    <div className={`relative flex items-center justify-center flex-shrink-0 ${className}`}>
      {!hasError && (
        <img
          src={imgSrc}
          alt={alt}
          onError={handleError}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-contain transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
            }`}
        />
      )}

      {/* Fallback gradient icon displayed while image loads or if both files are missing */}
      {(!isLoaded || hasError) && (
        <div
          className={`${hasError ? 'w-full h-full' : 'absolute inset-0'
            } rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-md shadow-primary-500/20`}
        >
          <FiBarChart2 className={`${iconSize} text-white`} />
        </div>
      )}
    </div>
  );
}
