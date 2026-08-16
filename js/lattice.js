// QUANTAI — the ether.
// One continuous scene. Threads of golden light begin scattered across time;
// as the visitor travels, they come into coherence — aligning, weaving a
// foundation, and finally gathering toward a single point of light.
// Bespoke WebGL. No libraries, nothing external.

(function () {
  const canvas = document.getElementById('lattice');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 700px)').matches;
  const gl = canvas && canvas.getContext('webgl', { antialias: true, alpha: false });

  if (!gl) {
    document.body.classList.add('static');
    if (canvas) canvas.style.display = 'none';
    return;
  }
  if (reduceMotion) document.body.classList.add('static');

  const IVORY = [0.980, 0.968, 0.945];
  const GOLD = [0.690, 0.553, 0.243];   // #B08D3E
  const LIT  = [0.831, 0.725, 0.416];   // #D4B96A
  const DEEP = [0.541, 0.424, 0.157];   // #8A6C28

  // -------------------------------------------------------------- noise

  function hash3(x, y, z) {
    const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function noise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    let r = 0;
    for (let dx = 0; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) for (let dz = 0; dz <= 1; dz++) {
      r += hash3(xi + dx, yi + dy, zi + dz)
        * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
    }
    return r * 2 - 1;
  }

  // -------------------------------------------------------------- weave

  const THREADS = isMobile ? 160 : 300;
  const STEPS = 46;
  const PER_FAM = Math.ceil(THREADS / 4);

  // chaos: a noise-walk through a wide volume
  function chaosThread(t, fam, seed) {
    const pts = [];
    let px = (hash3(t, 0.3, 9.2) * 2 - 1) * 100;
    let py = (hash3(t, 4.1, 1.7) * 2 - 1) * 60;
    let pz = -210 + hash3(t, 8.8, 5.5) * 260;
    const base = [
      [1, 0.12, 0], [-1, -0.1, 0.05], [0.15, 1, 0.1], [0, 0.08, -1],
    ][fam];
    const s = 0.02;
    for (let i = 0; i <= STEPS; i++) {
      pts.push([px, py, pz]);
      let dx = base[0] + 1.25 * noise3(px * s + seed, py * s, pz * s);
      let dy = base[1] + 1.25 * noise3(px * s, py * s + seed + 31.4, pz * s);
      let dz = base[2] + 1.25 * noise3(px * s, py * s, pz * s + seed + 77.7);
      const il = 2.2 / Math.hypot(dx, dy, dz);
      px += dx * il; py += dy * il; pz += dz * il;
    }
    return pts;
  }

  // order: the golden foundation — a weave low in the frame, rails running to
  // the horizon, and rising strings above it
  function orderThread(t, fam) {
    const lane = Math.floor(t / 4);
    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const u = i / STEPS;
      let x = 0, y = 0, z = 0;
      if (fam === 0 || fam === 1) {
        const row = lane % 6, col = Math.floor(lane / 6);
        const dirn = fam === 0 ? 1 : -1;
        x = dirn * (-85 + 170 * u);
        y = -8.6 + row * 0.6 + (fam === 1 ? 0.3 : 0);
        z = (fam === 0 ? 16 : 9) - col * 13.5;
        y += Math.sin(x * 0.42 + row * 2.1 + fam * 1.57) * 0.55; // the weave
        z += Math.sin(x * 0.2 + col) * 0.5;
      } else if (fam === 3) {
        const lx = (lane - PER_FAM / 2) * 3.6;
        x = lx * (1 - 0.62 * u);           // rails converge toward the horizon
        y = -8.3 + Math.sin(u * 12.56 + lane) * 0.3;
        z = 22 - 210 * u;
      } else {
        const lx = (lane - PER_FAM / 2) * 5.4;
        x = lx + Math.sin(u * 3.14159) * 1.4;
        y = -8.6 + 16.5 * u;               // strings rising from the foundation
        z = -18 - (lane % 7) * 17;
      }
      pts.push([x, y, z]);
    }
    return pts;
  }

  // -------------------------------------------------------------- geometry

  const F = { chaos: [], chaosN: [], order: [], orderN: [], side: [], dirSign: [], meta: [] };
  const idx = [];
  const nodeChaos = [], nodeOrder = [], nodeSeed = [];
  let vBase = 0;

  for (let t = 0; t < THREADS; t++) {
    const fam = t % 4;
    const seed = hash3(t * 1.3, fam * 7.7, 2.1) * 100;
    const stagger = hash3(t * 2.7, 1.1, fam) * 0.85;
    const C = chaosThread(t, fam, seed);
    const O = orderThread(t, fam);
    for (let i = 0; i <= STEPS; i++) {
      const j = i < STEPS ? i + 1 : i - 1;
      const ds = i < STEPS ? 1 : -1;
      for (let side = -1; side <= 1; side += 2) {
        F.chaos.push(...C[i]); F.chaosN.push(...C[j]);
        F.order.push(...O[i]); F.orderN.push(...O[j]);
        F.side.push(side); F.dirSign.push(ds);
        F.meta.push(i / STEPS, fam, seed, stagger);
      }
      if (i < STEPS) {
        const a = vBase + i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      if (i > 0 && i % 11 === 0) {
        nodeChaos.push(...C[i]); nodeOrder.push(...O[i]); nodeSeed.push(seed + i);
      }
    }
    vBase += (STEPS + 1) * 2;
  }

  // -------------------------------------------------------------- programs

  function compile(vs, fs) {
    function sh(type, src) {
      const h = gl.createShader(type);
      gl.shaderSource(h, src); gl.compileShader(h);
      if (!gl.getShaderParameter(h, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(h));
      return h;
    }
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  const ribbonVS = `
    attribute vec3 aChaos; attribute vec3 aChaosN;
    attribute vec3 aOrder; attribute vec3 aOrderN;
    attribute float aSide; attribute float aDirSign;
    attribute vec4 aMeta; // along, family, seed, stagger
    uniform mat4 uMVP;
    uniform vec3 uCam;
    uniform vec3 uGatherPt;
    uniform float uCoherence, uGather, uPx, uAspect;
    varying float vSide, vDepth, vAlong, vFam, vSeed, vCoh;
    void main() {
      float c = smoothstep(0.0, 1.0, clamp((uCoherence - aMeta.w * 0.55) / 0.45, 0.0, 1.0));
      vCoh = c;
      vec3 P = mix(aChaos, aOrder, c);
      vec3 N = mix(aChaosN, aOrderN, c);
      P = mix(P, uGatherPt, uGather * (0.35 + 0.65 * aMeta.w));
      N = mix(N, uGatherPt, uGather * (0.35 + 0.65 * aMeta.w));
      vDepth = distance(P, uCam);
      vec4 cp = uMVP * vec4(P, 1.0);
      vec4 cn = uMVP * vec4(N, 1.0);
      vec2 dir = normalize((cn.xy / max(cn.w, 0.001) - cp.xy / max(cp.w, 0.001)) * vec2(uAspect, 1.0) + vec2(1e-5));
      dir *= aDirSign;
      vec2 perp = vec2(-dir.y, dir.x) / vec2(uAspect, 1.0);
      float px = uPx * clamp(34.0 / vDepth, 0.22, 2.4);
      cp.xy += perp * aSide * px * cp.w;
      vSide = aSide; vAlong = aMeta.x; vFam = aMeta.y; vSeed = aMeta.z;
      gl_Position = cp;
    }
  `;
  const ribbonFS = `
    precision mediump float;
    uniform float uTime, uAlpha;
    uniform vec3 uIvory, uGold, uDeep, uLit;
    varying float vSide, vDepth, vAlong, vFam, vSeed, vCoh;
    float timeDir(float fam, float t, float seed) {
      if (fam < 0.5) return  t * 0.5;
      if (fam < 1.5) return -t * 0.36;
      if (fam < 2.5) return  sin(t * 0.33 + seed) * 1.5;
      return t * 0.85;
    }
    void main() {
      float phase = vAlong * 8.0 + vSeed * 6.2831 - timeDir(vFam, uTime, vSeed);
      float f = fract(phase);
      float pulse = smoothstep(0.0, 0.07, f) * smoothstep(0.62, 0.12, f);
      float edge = 1.0 - vSide * vSide;
      edge = pow(edge, 1.7);
      float depthFade = smoothstep(250.0, 12.0, vDepth);
      float body = mix(0.30, 0.5, vCoh);
      float alpha = uAlpha * edge * depthFade * (body + 0.62 * pulse);
      vec3 col = mix(uGold, uDeep, pulse * 0.9);
      col = mix(col, uLit, vCoh * 0.22);
      col = mix(uIvory, col, min(depthFade * 1.3, 1.0));
      gl_FragColor = vec4(col, alpha);
    }
  `;
  const ribbonProg = compile(ribbonVS, ribbonFS);

  const nodeProg = compile(`
    attribute vec3 aChaos; attribute vec3 aOrder; attribute float aSeed;
    uniform mat4 uMVP; uniform vec3 uCam; uniform vec3 uGatherPt;
    uniform float uCoherence, uGather, uDpr;
    varying float vSeed, vDepth;
    void main() {
      float c = smoothstep(0.0, 1.0, clamp((uCoherence - fract(aSeed) * 0.5) / 0.5, 0.0, 1.0));
      vec3 P = mix(aChaos, aOrder, c);
      P = mix(P, uGatherPt, uGather * 0.6);
      vSeed = aSeed;
      vDepth = distance(P, uCam);
      gl_PointSize = min(uDpr * 260.0 / max(vDepth, 1.0), uDpr * 7.0);
      gl_Position = uMVP * vec4(P, 1.0);
    }
  `, `
    precision mediump float;
    uniform float uTime;
    uniform vec3 uIvory; uniform vec3 uDeep;
    varying float vSeed, vDepth;
    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float disk = smoothstep(0.5, 0.08, length(uv));
      float tw = 0.5 + 0.5 * sin(uTime * 0.6 + vSeed);
      float depthFade = smoothstep(250.0, 12.0, vDepth) * smoothstep(6.0, 26.0, vDepth);
      gl_FragColor = vec4(mix(uIvory, uDeep, depthFade), disk * depthFade * 0.32 * tw);
    }
  `);

  // horizon light — drawn as a fullscreen quad, pure fragment work
  const lightProg = compile(`
    attribute vec2 aXY;
    varying vec2 vUV;
    void main() { vUV = aXY * 0.5 + 0.5; gl_Position = vec4(aXY, 0.0, 1.0); }
  `, `
    precision mediump float;
    uniform float uGlow, uAspect;
    uniform vec3 uLit, uGold;
    varying vec2 vUV;
    void main() {
      vec2 d = (vUV - vec2(0.5, 0.47)) * vec2(uAspect, 1.0);
      float r = length(d);
      float core = exp(-r * r * 34.0);
      float halo = exp(-r * r * 7.0);
      // light on ivory: a lifted warm core inside a golden haze
      vec3 col = mix(uGold, vec3(1.0, 0.99, 0.965), core * 0.9);
      float a = uGlow * (halo * 0.20 + core * 0.5);
      gl_FragColor = vec4(col, a);
    }
  `);

  // -------------------------------------------------------------- buffers

  function buf(data) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return b;
  }
  const B = {
    chaos: buf(F.chaos), chaosN: buf(F.chaosN),
    order: buf(F.order), orderN: buf(F.orderN),
    side: buf(F.side), dirSign: buf(F.dirSign), meta: buf(F.meta),
    nChaos: buf(nodeChaos), nOrder: buf(nodeOrder), nSeed: buf(nodeSeed),
    quad: buf([-1, -1, 3, -1, -1, 3]),
  };
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW);
  const uint = gl.getExtension('OES_element_index_uint');
  const nIdx = idx.length;
  const nNodes = nodeSeed.length;

  function attr(prog, name, buffer, size) {
    const loc = gl.getAttribLocation(prog, name);
    if (loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  }
  function U(prog) {
    const cache = {};
    return (n) => cache[n] || (cache[n] = gl.getUniformLocation(prog, n));
  }
  const uR = U(ribbonProg), uN = U(nodeProg), uL = U(lightProg);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(IVORY[0], IVORY[1], IVORY[2], 1);

  // -------------------------------------------------------------- matrices

  const proj = new Float32Array(16), view = new Float32Array(16), mvp = new Float32Array(16);
  function perspective(fovY, aspect, near, far, out) {
    const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
    out.set([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function multiply(a, b, out) {
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  function viewMatrix(cx, cy, cz, rx, ry, rz, out) {
    const cX = Math.cos(-rx), sX = Math.sin(-rx);
    const cY = Math.cos(-ry), sY = Math.sin(-ry);
    const cZ = Math.cos(-rz), sZ = Math.sin(-rz);
    const r00 = cZ * cY + sZ * sX * sY, r01 = sZ * cX, r02 = -cZ * sY + sZ * sX * cY;
    const r10 = -sZ * cY + cZ * sX * sY, r11 = cZ * cX, r12 = sZ * sY + cZ * sX * cY;
    const r20 = cX * sY, r21 = -sX, r22 = cX * cY;
    out.set([
      r00, r10, r20, 0, r01, r11, r21, 0, r02, r12, r22, 0,
      -(r00 * cx + r01 * cy + r02 * cz),
      -(r10 * cx + r11 * cy + r12 * cz),
      -(r20 * cx + r21 * cy + r22 * cz), 1,
    ]);
  }

  // -------------------------------------------------------------- timeline

  function smooth(a, b, x) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  let mouseX = 0, mouseY = 0, curX = 0, curY = 0, scrollP = 0;
  window.addEventListener('pointermove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  function readScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollP = max > 0 ? window.scrollY / max : 0;
  }
  window.addEventListener('scroll', readScroll, { passive: true });

  let W = 0, H = 0, dpr = 1, aspect = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    W = Math.round(window.innerWidth * dpr);
    H = Math.round(window.innerHeight * dpr);
    canvas.width = W; canvas.height = H;
    aspect = W / H;
    perspective(50 * Math.PI / 180, aspect, 0.1, 520, proj);
  }
  window.addEventListener('resize', () => { resize(); if (still) render(8); });
  resize(); readScroll();

  const GATHER_PT = [0, -1.5, -185];

  function render(t) {
    const p = scrollP;
    const coherence = smooth(0.10, 0.56, p);
    const gather = smooth(0.88, 0.995, p) * 0.9;
    const glow = coherence * 0.5 + smooth(0.5, 0.65, p) * 0.2 + gather * 1.1;

    curX += (mouseX - curX) * 0.03;
    curY += (mouseY - curY) * 0.03;
    const calm = 1 - coherence * 0.7; // order is still
    const cx = curX * 3.0 * calm + Math.sin(t * 0.05) * 1.5 * calm;
    const cy = -curY * 2.0 * calm + Math.cos(t * 0.04) * calm
      - 4.2 * coherence + 2.2 * gather;
    const cz = 26 - p * 118;
    const rx = curY * 0.03 * calm - 0.03 * coherence;
    const ry = -curX * 0.04 * calm;
    const rz = (Math.sin(t * 0.03) * 0.02 + 0.05) * calm * (1 - smooth(0.0, 0.2, p) * 0.4);

    viewMatrix(cx, cy, cz, rx, ry, rz, view);
    multiply(proj, view, mvp);

    gl.viewport(0, 0, W, H);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // horizon light — beneath the threads
    gl.useProgram(lightProg);
    attr(lightProg, 'aXY', B.quad, 2);
    gl.uniform1f(uL('uGlow'), Math.min(glow, 1.6));
    gl.uniform1f(uL('uAspect'), aspect);
    gl.uniform3fv(uL('uLit'), LIT);
    gl.uniform3fv(uL('uGold'), GOLD);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // threads — glow pass then body pass
    gl.useProgram(ribbonProg);
    attr(ribbonProg, 'aChaos', B.chaos, 3);
    attr(ribbonProg, 'aChaosN', B.chaosN, 3);
    attr(ribbonProg, 'aOrder', B.order, 3);
    attr(ribbonProg, 'aOrderN', B.orderN, 3);
    attr(ribbonProg, 'aSide', B.side, 1);
    attr(ribbonProg, 'aDirSign', B.dirSign, 1);
    attr(ribbonProg, 'aMeta', B.meta, 4);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.uniformMatrix4fv(uR('uMVP'), false, mvp);
    gl.uniform3f(uR('uCam'), cx, cy, cz);
    gl.uniform3fv(uR('uGatherPt'), GATHER_PT);
    gl.uniform1f(uR('uCoherence'), coherence);
    gl.uniform1f(uR('uGather'), gather);
    gl.uniform1f(uR('uTime'), t);
    gl.uniform1f(uR('uAspect'), aspect);
    gl.uniform3fv(uR('uIvory'), IVORY);
    gl.uniform3fv(uR('uGold'), GOLD);
    gl.uniform3fv(uR('uDeep'), DEEP);
    gl.uniform3fv(uR('uLit'), LIT);

    if (uint) {
      gl.uniform1f(uR('uPx'), 0.0075);  // halo
      gl.uniform1f(uR('uAlpha'), 0.16);
      gl.drawElements(gl.TRIANGLES, nIdx, gl.UNSIGNED_INT, 0);
      gl.uniform1f(uR('uPx'), 0.0021);  // body
      gl.uniform1f(uR('uAlpha'), 1.0);
      gl.drawElements(gl.TRIANGLES, nIdx, gl.UNSIGNED_INT, 0);
    }

    // nodes
    gl.useProgram(nodeProg);
    attr(nodeProg, 'aChaos', B.nChaos, 3);
    attr(nodeProg, 'aOrder', B.nOrder, 3);
    attr(nodeProg, 'aSeed', B.nSeed, 1);
    gl.uniformMatrix4fv(uN('uMVP'), false, mvp);
    gl.uniform3f(uN('uCam'), cx, cy, cz);
    gl.uniform3fv(uN('uGatherPt'), GATHER_PT);
    gl.uniform1f(uN('uCoherence'), coherence);
    gl.uniform1f(uN('uGather'), gather);
    gl.uniform1f(uN('uTime'), t);
    gl.uniform1f(uN('uDpr'), dpr);
    gl.drawArrays(gl.POINTS, 0, nNodes);
  }

  // -------------------------------------------------------------- loop

  let running = true;
  const still = reduceMotion;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !still) requestAnimationFrame(tick);
  });

  const t0 = performance.now();
  function tick() {
    if (!running) return;
    render((performance.now() - t0) / 1000);
    requestAnimationFrame(tick);
  }

  if (still) {
    scrollP = 0.45; // the weave, half-formed — the etching
    render(8);
  } else {
    requestAnimationFrame(tick);
  }
})();
