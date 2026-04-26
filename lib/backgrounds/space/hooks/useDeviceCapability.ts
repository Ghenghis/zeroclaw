'use client';

import { useEffect, useState } from 'react';

export type DeviceTier = 'high' | 'medium' | 'low';

export interface DeviceCapability {
  hasWebGL: boolean;
  estimatedTier: DeviceTier;
  isMobile: boolean;
  maxTextureSize: number;
}

function detectTier(gl: WebGLRenderingContext | null, isMobile: boolean): DeviceTier {
  if (!gl) return 'low';
  if (isMobile) return 'medium';

  // Heuristic: check renderer string for known low-end GPUs
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  if (dbg) {
    const renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string;
    const lowEnd = /intel hd|intel uhd|mali-4|adreno 3|powervr/i.test(renderer);
    if (lowEnd) return 'medium';
  }

  // Check max texture size as proxy for GPU capability
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  if (maxTex >= 8192) return 'high';
  if (maxTex >= 4096) return 'medium';
  return 'low';
}

const DEFAULT: DeviceCapability = {
  hasWebGL: false,
  estimatedTier: 'medium',
  isMobile: false,
  maxTextureSize: 4096,
};

export function useDeviceCapability(): DeviceCapability {
  const [capability, setCapability] = useState<DeviceCapability>(DEFAULT);

  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent);

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;

    const maxTextureSize = gl
      ? (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number)
      : 0;

    setCapability({
      hasWebGL: !!gl,
      estimatedTier: detectTier(gl, isMobile),
      isMobile,
      maxTextureSize,
    });
  }, []);

  return capability;
}
