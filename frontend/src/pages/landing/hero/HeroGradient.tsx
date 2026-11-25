import { useEffect, useRef } from 'react';
import { useMotionPreference } from '../../../state/useMotionPreference';

/* A living gradient behind the first screen: three layers of simplex noise drift slowly
   and blend palette colours, with a soft centre glow and a vignette. Adapted from the
   Velaris background: the vignette fades into the page colour instead of black, so it
   also works on the light theme. */

const vertex = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `
precision highp float;
varying vec2 vUv;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_grain;
uniform float u_glow;
uniform float u_edge;
uniform vec3  u_colors[4];
uniform vec3  u_bg;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv;
  float ratio = u_resolution.x / u_resolution.y;
  vec2 p = uv - 0.5;
  p.x *= ratio;

  float t = u_time * 0.1;
  float n1 = snoise(p * 0.4 + vec2(t * 0.2, -t * 0.3));
  float n2 = snoise(p * 0.55 + vec2(-t * 0.15, t * 0.25) + n1 * 0.25);
  float n3 = snoise(p * 0.75 + vec2(t * 0.1, -t * 0.2) + n2 * 0.2);

  vec3 col = u_bg;
  float dist = length(p) * 1.5;
  float vignette = 1.0 - smoothstep(0.3, 1.2, dist);

  col = mix(col, u_colors[0], smoothstep(-0.2, 0.5, n1) * 0.85);
  col = mix(col, u_colors[1], smoothstep(-0.1, 0.6, n2) * 0.7);
  col = mix(col, u_colors[2], smoothstep(-0.3, 0.4, n3) * 0.6);
  col = mix(col, u_colors[3], smoothstep(0.0, 0.7, n1 * n2) * 0.5);

  col += u_colors[1] * smoothstep(0.8, 0.0, dist) * u_glow;
  // Edges settle into the page colour (light) or darken (dark), never into pure black.
  col = mix(u_bg * u_edge, col, vignette);

  float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453 + u_time);
  col += (grain - 0.5) * u_grain * 0.1;

  gl_FragColor = vec4(col, 1.0);
}
`;

// Palette from the Figma file: peach, soft orange and sage on the light canvas;
// terracotta and olive on the dark olive canvas.
const themes = {
  light: {
    bg: '#eceee6',
    colors: ['#f6cdb4', '#f39b74', '#dde4cf', '#fbe3d3'],
    glow: 0.1,
    edge: 1,
    grain: 0.12,
  },
  dark: {
    bg: '#151813',
    colors: ['#4a2a1a', '#8a3b1b', '#28321f', '#1b1f18'],
    glow: 0.25,
    edge: 0.55,
    grain: 0.18,
  },
} as const;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function HeroGradient({ speed = 2, className }: { speed?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useMotionPreference();

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', { antialias: false, alpha: false });
    if (!canvas || !gl) return;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const at = (name: string) => gl.getUniformLocation(program, name);
    const u = {
      res: at('u_resolution'),
      time: at('u_time'),
      grain: at('u_grain'),
      glow: at('u_glow'),
      edge: at('u_edge'),
      colors: at('u_colors'),
      bg: at('u_bg'),
    };

    function applyTheme() {
      const theme = document.documentElement.dataset.theme === 'dark' ? themes.dark : themes.light;
      gl!.uniform3f(u.bg, ...rgb(theme.bg));
      gl!.uniform3fv(u.colors, new Float32Array(theme.colors.flatMap(rgb)));
      gl!.uniform1f(u.glow, theme.glow);
      gl!.uniform1f(u.edge, theme.edge);
      // With reduced motion the frame is still, so animated grain would only read as dirt.
      gl!.uniform1f(u.grain, reduced ? 0 : theme.grain);
    }

    let frame = 0;
    let visible = true;
    const stillTime = 8; // a pleasant fixed moment for reduced motion

    function draw(now: number) {
      frame = 0;
      gl!.uniform2f(u.res, canvas!.width, canvas!.height);
      gl!.uniform1f(u.time, reduced ? stillTime : now * 0.001 * speed);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      if (!reduced && visible && !document.hidden) frame = requestAnimationFrame(draw);
    }
    function queue() {
      if (!frame) frame = requestAnimationFrame(draw);
    }
    function resize() {
      // The gradient is soft, so it does not need full resolution: half-size saves a lot of GPU.
      const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
      canvas!.width = Math.max(1, Math.round(canvas!.clientWidth * scale));
      canvas!.height = Math.max(1, Math.round(canvas!.clientHeight * scale));
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      queue();
    }

    applyTheme();
    const sizeWatch = new ResizeObserver(resize);
    sizeWatch.observe(canvas);
    const viewWatch = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) queue();
    });
    viewWatch.observe(canvas);
    const themeWatch = new MutationObserver(() => {
      applyTheme();
      queue();
    });
    themeWatch.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    document.addEventListener('visibilitychange', queue);
    resize();

    return () => {
      sizeWatch.disconnect();
      viewWatch.disconnect();
      themeWatch.disconnect();
      document.removeEventListener('visibilitychange', queue);
      cancelAnimationFrame(frame);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [reduced, speed]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
