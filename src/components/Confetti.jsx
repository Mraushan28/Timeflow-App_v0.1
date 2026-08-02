import React, { useMemo } from 'react';

/**
 * Lightweight confetti celebration component.
 * Renders a burst of colorful flying pieces (pure CSS, no external deps).
 */
export default function Confetti({ count = 60, triggerKey = 0 }) {
    const pieces = useMemo(() => {
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
        return Array.from({ length: count }, (_, i) => {
            const angle = Math.random() * 2 * Math.PI;
            const distance = 80 + Math.random() * 180;
            const delay = Math.random() * 0.35;
            const duration = 1.4 + Math.random() * 1.2;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const rotateEnd = (Math.random() * 720) - 360;
            return {
                id: `${triggerKey}-${i}`,
                color: colors[Math.floor(Math.random() * colors.length)],
                x,
                y,
                delay,
                duration,
                size: 8 + Math.random() * 8,
                rotateStart: Math.random() * 360,
                rotateEnd,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            };
        });
    }, [count, triggerKey]);

    return (
        <div className="fixed inset-0 z-[150] pointer-events-none overflow-hidden">
            {pieces.map(p => (
                <span
                    key={p.id}
                    className="absolute"
                    style={{
                        left: '50%',
                        top: '50%',
                        width: p.size,
                        height: p.size,
                        background: p.color,
                        borderRadius: p.borderRadius,
                        marginLeft: -p.size / 2,
                        marginTop: -p.size / 2,
                        transform: `rotate(${p.rotateStart}deg)`,
                        animation: `confetti-burst ${p.duration}s cubic-bezier(0.16, 0.84, 0.44, 1) ${p.delay}s forwards`,
                        '--cf-x': `${p.x}px`,
                        '--cf-y': `${p.y}px`,
                        '--cf-rotate': `${p.rotateEnd}deg`,
                    }}
                />
            ))}
        </div>
    );
}

