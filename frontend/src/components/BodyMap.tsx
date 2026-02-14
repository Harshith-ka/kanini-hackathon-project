
import React, { useState } from 'react';

interface BodyMapProps {
    onSelectPart: (part: string) => void;
    selectedParts?: string[];
}

const BodyMap: React.FC<BodyMapProps> = ({ onSelectPart, selectedParts = [] }) => {
    const [hovered, setHovered] = useState<string | null>(null);

    const parts = [
        { id: 'head', name: 'Head', d: "M100,50 C100,25 140,25 140,50 C140,75 100,75 100,50 Z", cx: 120, cy: 50 },
        { id: 'chest', name: 'Chest', d: "M90,80 L150,80 L140,140 L100,140 Z", cx: 120, cy: 110 },
        { id: 'abdomen', name: 'Abdomen', d: "M100,140 L140,140 L135,190 L105,190 Z", cx: 120, cy: 165 },
        { id: 'l_arm', name: 'Left Arm', d: "M150,80 L180,100 L170,160 L140,140 Z", cx: 160, cy: 120 },
        { id: 'r_arm', name: 'Right Arm', d: "M90,80 L60,100 L70,160 L100,140 Z", cx: 80, cy: 120 },
        { id: 'l_leg', name: 'Left Leg', d: "M135,190 L150,280 L130,280 L120,190 Z", cx: 140, cy: 235 },
        { id: 'r_leg', name: 'Right Leg', d: "M105,190 L90,280 L110,280 L120,190 Z", cx: 100, cy: 235 },
    ];

    const getSymptomForPart = (partId: string) => {
        const map: { [key: string]: string } = {
            'head': 'headache',
            'chest': 'chest_pain',
            'abdomen': 'abdominal_pain',
            'l_arm': 'joint_pain',
            'r_arm': 'joint_pain',
            'l_leg': 'joint_pain',
            'r_leg': 'joint_pain'
        };
        return map[partId] || 'other';
    };

    return (
        <div style={{ position: 'relative', width: 240, height: 320, margin: '0 auto' }}>
            <svg viewBox="0 0 240 320" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>
                {parts.map((part) => {
                    const isSelected = selectedParts.includes(getSymptomForPart(part.id));
                    const isHovered = hovered === part.id;

                    return (
                        <g
                            key={part.id}
                            onClick={() => onSelectPart(getSymptomForPart(part.id))}
                            onMouseEnter={() => setHovered(part.id)}
                            onMouseLeave={() => setHovered(null)}
                            style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                        >
                            <path
                                d={part.d}
                                fill={isSelected ? 'var(--accent)' : isHovered ? 'rgba(37, 99, 235, 0.4)' : '#e2e8f0'}
                                stroke={isSelected ? '#1e40af' : '#94a3b8'}
                                strokeWidth="2"
                            />
                            {isHovered && (
                                <text
                                    x={part.cx}
                                    y={part.cy}
                                    textAnchor="middle"
                                    fill="#1e293b"
                                    style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', pointerEvents: 'none' }}
                                >
                                    {part.name}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#64748b' }}>
                Select body part to add symptoms
            </div>
        </div>
    );
};

export default BodyMap;
