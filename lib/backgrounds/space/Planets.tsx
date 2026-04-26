'use client';

import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { TextureLoader, Mesh, Vector3 } from 'three';
import type { PlanetConfig, MoonConfig } from './space.config';

// ── Moon ─────────────────────────────────────────────────────────────────────

const Moon: React.FC<{ moon: MoonConfig }> = ({ moon }) => {
  const moonRef = useRef<Mesh>(null);
  const texture = useLoader(TextureLoader, moon.textureUrl);
  const angle   = useRef(Math.random() * Math.PI * 2);

  useFrame(() => {
    if (!moonRef.current) return;
    angle.current += moon.orbitSpeed;
    moonRef.current.position.set(
      Math.cos(angle.current) * moon.orbitRadius,
      Math.sin(angle.current * 0.3) * 0.2,
      Math.sin(angle.current) * moon.orbitRadius
    );
    moonRef.current.rotation.y += 0.005;
  });

  return (
    <mesh ref={moonRef}>
      <sphereGeometry args={[moon.radius, 16, 16]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
};

// ── Rings ─────────────────────────────────────────────────────────────────────

const PlanetRings: React.FC<{ inner: number; outer: number }> = ({ inner, outer }) => (
  <mesh rotation={[Math.PI * 0.4, 0, 0.2]}>
    <ringGeometry args={[inner, outer, 64]} />
    <meshStandardMaterial color="#c8a870" transparent opacity={0.55} side={2} />
  </mesh>
);

// ── Planet ────────────────────────────────────────────────────────────────────

const Planet: React.FC<{ pc: PlanetConfig }> = ({ pc }) => {
  const meshRef = useRef<Mesh>(null);
  const texture = useLoader(TextureLoader, pc.textureUrl);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += pc.rotationSpeed;
    const t = hovered ? 1.06 : 1.0;
    meshRef.current.scale.lerp(new Vector3(t, t, t), 0.05);
  });

  return (
    <group position={pc.position}>
      <mesh
        ref={meshRef}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[pc.radius, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          emissive={hovered ? '#334466' : '#000000'}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>

      {pc.hasRings && pc.ringInnerRadius && pc.ringOuterRadius && (
        <PlanetRings inner={pc.ringInnerRadius} outer={pc.ringOuterRadius} />
      )}

      {pc.moons.map((moon, i) => <Moon key={i} moon={moon} />)}

      {hovered && (
        <Html distanceFactor={6} center>
          <div style={{
            background: 'rgba(8,12,30,0.92)',
            border: '1px solid rgba(100,150,255,0.4)',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#c8d8ff',
            fontSize: '13px',
            fontFamily: 'system-ui, sans-serif',
            maxWidth: '220px',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 0 20px rgba(80,120,255,0.3)',
            pointerEvents: 'none',
          }}>
            <div style={{ fontWeight: 700, color: '#88bbff', marginBottom: 4 }}>{pc.name}</div>
            <div style={{ opacity: 0.85, lineHeight: 1.5 }}>{pc.funFact}</div>
          </div>
        </Html>
      )}
    </group>
  );
};

// ── Planets Container ─────────────────────────────────────────────────────────

export const Planets: React.FC<{ planets: PlanetConfig[] }> = ({ planets }) => {
  if (planets.length === 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 12], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true }}
      >
        <ambientLight intensity={0.15} />
        <pointLight position={[20, 20, 20]} intensity={1.2} color="#ffe8cc" />
        <pointLight position={[-15, -10, -20]} intensity={0.3} color="#aaccff" />
        <Suspense fallback={null}>
          {planets.map(p => <Planet key={p.id} pc={p} />)}
        </Suspense>
      </Canvas>
    </div>
  );
};
