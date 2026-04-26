'use client';

import React, { useEffect, useRef } from 'react';
import type { AuroraConfig } from './space.config';

interface AuroraProps {
  config: AuroraConfig;
}

export const Aurora: React.FC<AuroraProps> = ({ config }) => {
  const topRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const animate = async () => {
      try {
        const { gsap } = await import('gsap');
        const targets = [
          ...(config.position !== 'bottom' && topRef.current ? [topRef.current] : []),
          ...(config.position !== 'top'    && botRef.current ? [botRef.current] : []),
        ];
        targets.forEach(el => {
          gsap.to(el, {
            backgroundPositionX: '200%',
            duration: config.animationDuration,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          });
          gsap.to(el, {
            opacity: config.opacity * 1.4,
            duration: config.animationDuration * 0.6,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            delay: config.animationDuration * 0.2,
          });
        });
      } catch {
        // GSAP not available — CSS keyframes handle it
      }
    };
    animate();
  }, [config]);

  const gradient = `linear-gradient(90deg, ${config.colors.join(', ')}, ${config.colors[0]})`;

  const sharedStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    height: `${config.height}vh`,
    backgroundImage: gradient,
    backgroundSize: '300% 100%',
    opacity: config.opacity,
    filter: 'blur(32px)',
    animation: `aurora-shift ${config.animationDuration}s ease-in-out infinite alternate`,
    pointerEvents: 'none',
    zIndex: 4,
    mixBlendMode: 'screen',
  };

  return (
    <>
      <style>{`
        @keyframes aurora-shift {
          0%   { background-position: 0% 50%;   opacity: ${config.opacity}; }
          50%  { background-position: 100% 50%; opacity: ${config.opacity * 1.35}; }
          100% { background-position: 200% 50%; opacity: ${config.opacity}; }
        }
      `}</style>
      {(config.position === 'top' || config.position === 'both') && (
        <div ref={topRef} style={{ ...sharedStyle, top: 0 }} aria-hidden="true" />
      )}
      {(config.position === 'bottom' || config.position === 'both') && (
        <div
          ref={botRef}
          style={{ ...sharedStyle, bottom: 0, animationDelay: `${config.animationDuration * 0.4}s` }}
          aria-hidden="true"
        />
      )}
    </>
  );
};
