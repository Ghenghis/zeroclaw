'use client';

import React, { useEffect, useRef } from 'react';
import type { SpaceConfig } from './space.config';
import type { MouseState } from './hooks/useMouseParallax';

interface NebulaProps {
  config: SpaceConfig;
  mouseRef: React.MutableRefObject<MouseState>;
}

// ─── GLSL Sources (inline — no build plugin required) ─────────────────────

const VERT_SRC = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  precision highp float;

  uniform vec2  u_resolution;
  uniform float u_time;
  uniform vec2  u_mouse;
  uniform float u_mouseStrength;
  uniform float u_mouseRadius;
  uniform vec4  u_color0;
  uniform vec4  u_color1;
  uniform vec4  u_color2;
  uniform float u_opacity;

  // Simplex noise (2D) — Ashima Arts
  vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0,i1.y,1.0))
                + i.x + vec3(0.0,i1.x,1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                             dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x2 = 2.0*fract(p*C.www)-1.0;
    vec3 h  = abs(x2)-0.5;
    vec3 ox = floor(x2+0.5);
    vec3 a0 = x2-ox;
    m *= 1.79284291400159 - 0.85373472095314*(a0*a0+h*h);
    vec3 g;
    g.x  = a0.x*x0.x  + h.x*x0.y;
    g.yz = a0.yz*x12.xz + h.yz*x12.yw;
    return 130.0*dot(m,g);
  }

  float fbm(vec2 p, int octaves) {
    float v=0.0, a=0.5;
    mat2 rot = mat2(cos(0.5),sin(0.5),-sin(0.5),cos(0.5));
    for (int i=0;i<8;i++) {
      if (i>=octaves) break;
      v += a*snoise(p);
      p  = rot*p*2.1 + vec2(1.7,9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    // Mouse gravitational lens distortion
    vec2 mouseUV = u_mouse + 0.5;
    float mDist  = length(uv - mouseUV);
    float mNorm  = u_mouseRadius / u_resolution.x;
    float warp   = u_mouseStrength * smoothstep(mNorm, 0.0, mDist);
    vec2  wDir   = normalize(uv - mouseUV + 1e-5);
    vec2  warpUV = uv - wDir * warp * 0.06;

    float t  = u_time * 0.06;
    vec2  p  = warpUV * 3.2 + vec2(t*0.04, t*0.022);

    float n1 = fbm(p,         5) * 0.5 + 0.5;
    float n2 = fbm(p*1.8+5.3, 4) * 0.5 + 0.5;
    float n3 = fbm(p*0.45+2.1,3) * 0.5 + 0.5;

    float density = smoothstep(0.28, 0.88, n1*0.55 + n2*0.30 + n3*0.15);

    vec4 col;
    if (density < 0.33)
      col = mix(vec4(0.0), u_color0, density/0.33);
    else if (density < 0.66)
      col = mix(u_color0, u_color1, (density-0.33)/0.33);
    else
      col = mix(u_color1, u_color2, (density-0.66)/0.34);

    float vignette = 1.0 - smoothstep(0.4, 1.0, length(uv-0.5)*1.6);
    col.a *= density * u_opacity * vignette;

    gl_FragColor = col;
  }
`;

function hexToVec4(hex: string, alpha: number = 1): [number, number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
    alpha,
  ];
}

export const Nebula: React.FC<NebulaProps> = ({ config, mouseRef }) => {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const glRef        = useRef<WebGLRenderingContext | null>(null);
  const programRef   = useRef<WebGLProgram | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const rafRef       = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    });
    if (!gl) return;
    glRef.current = gl;

    const compile = (type: number, src: string): WebGLShader => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('[Nebula] Shader error:', gl.getShaderInfoLog(shader));
      }
      return shader;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[Nebula] Link error:', gl.getProgramInfoLog(program));
      return;
    }
    programRef.current = program;
    gl.useProgram(program);

    // Full-screen quad
    const verts = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    const aPosLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width  = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    // Upload static uniforms
    const nebulaColors = config.nebula.colors;
    const c0 = hexToVec4(nebulaColors[0] ?? '#1a0533');
    const c1 = hexToVec4(nebulaColors[1] ?? '#0d1f4c');
    const c2 = hexToVec4(nebulaColors[2] ?? '#0a2e1a');
    const u = (name: string) => gl.getUniformLocation(program, name);

    gl.uniform4fv(u('u_color0'), c0);
    gl.uniform4fv(u('u_color1'), c1);
    gl.uniform4fv(u('u_color2'), c2);
    gl.uniform1f(u('u_opacity'), config.nebula.opacity);
    gl.uniform1f(u('u_mouseStrength'), config.nebula.mouseDistortion.strength);
    gl.uniform1f(u('u_mouseRadius'), config.nebula.mouseDistortion.radius);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const t = (Date.now() - startTimeRef.current) * 0.001;
      gl.uniform1f(u('u_time'), t);
      gl.uniform2f(u('u_resolution'), canvas.width, canvas.height);
      gl.uniform2f(u('u_mouse'), mouseRef.current.x, mouseRef.current.y);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(program);
    };
  }, [config, mouseRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    />
  );
};
