// QUANTAI — the time lattice.
// Golden threads woven through an ivory ether. Each thread family carries
// light in a different direction of time: forward, backward, oscillating,
// and inward — the direction the visitor travels as they scroll.
// Bespoke WebGL. No libraries, no dependencies, nothing external.

(function () {
  const canvas = document.getElementById('lattice');
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
  if (!gl) { canvas.style.display = 'none'; return; }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 700px)').matches;

  const PAPER = [0.980, 0.968, 0.945];
  const GOLD = [0.690, 0.553, 0.243];   // #B08D3E
  const DEEP = [0.541, 0.424, 0.157];   // #8A6C28

  // ---------------------------------------------------------------- noise

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

  // ---------------------------------------------------------------- weave

  // Family base-directions. The shader gives each its own direction of time.
  const FAMILIES = [
    [1, 0.12, 0],       // 0 · forward
    [-1, -0.1, 0.05],   // 1 · backward
    [0.15, 1, 0.1],     // 2 · orthogonal — oscillating time
    [0, 0.08, -1],      // 3 · inward — the axis of travel
  ];

  const THREADS = isMobile ? 150 : 280;
  const STEPS = 52;
  const BX = 95, BY = 55, ZNEAR = 60, ZFAR = -200;

  const linePos = [], lineMeta = []; // meta: along, family, seed
  const nodePos = [], nodeSeed = [];

  for (let t = 0; t < THREADS; t++) {
    const fam = t % 4;
    const famW = fam === 3 ? 1.35 : 1.0;
    const seed = hash3(t * 1.3, fam * 7.7, 2.1) * 100;
    let px = (hash3(t, 0.3, 9.2) * 2 - 1) * BX;
    let py = (hash3(t, 4.1, 1.7) * 2 - 1) * BY;
    let pz = ZFAR + hash3(t, 8.8, 5.5) * (ZNEAR - ZFAR);
    let qx = px, qy = py, qz = pz;
    const s = 0.022;
    for (let i = 1; i <= STEPS; i++) {
      let dx = FAMILIES[fam][0] * famW + 1.15 * noise3(px * s + seed, py * s, pz * s);
      let dy = FAMILIES[fam][1] * famW + 1.15 * noise3(px * s, py * s + seed + 31.4, pz * s);
      let dz = FAMILIES[fam][2] * famW + 1.15 * noise3(px * s, py * s, pz * s + seed + 77.7);
      const il = 1.55 / Math.hypot(dx, dy, dz);
      px += dx * il; py += dy * il; pz += dz * il;
      if (px > BX) px = -BX; else if (px < -BX) px = BX;
      if (py > BY) py = -BY; else if (py < -BY) py = BY;
      const ddx = px - qx, ddy = py - qy, ddz = pz - qz;
      if (ddx * ddx + ddy * ddy + ddz * ddz < 40) { // skip wrap seams
        const a0 = (i - 1) / STEPS, a1 = i / STEPS;
        linePos.push(qx, qy, qz, px, py, pz);
        lineMeta.push(a0, fam, seed, a1, fam, seed);
        if (i % 13 === 0) { nodePos.push(px, py, pz); nodeSeed.push(seed + i); }
      }
      qx = px; qy = py; qz = pz;
    }
  }

  // ---------------------------------------------------------------- gl

  function compile(vsSrc, fsSrc) {
    function sh(type, src) {
      const h = gl.createShader(type);
      gl.shaderSource(h, src); gl.compileShader(h);
      if (!gl.getShaderParameter(h, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(h));
      return h;
    }
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  const lineProg = compile(`
    attribute vec3 aPos;
    attribute vec3 aMeta;      // along, family, seed
    uniform mat4 uMVP;
    uniform vec3 uCam;
    varying vec3 vMeta;
    varying float vDepth;
    void main() {
      vMeta = aMeta;
      vDepth = distance(aPos, uCam);
      gl_Position = uMVP * vec4(aPos, 1.0);
    }
  `, `
    precision mediump float;
    uniform float uTime;
    uniform vec3 uPaper; uniform vec3 uGold; uniform vec3 uDeep;
    varying vec3 vMeta;
    varying float vDepth;
    float timeDir(float fam, float t, float seed) {
      if (fam < 0.5) return  t * 0.55;                    // forward
      if (fam < 1.5) return -t * 0.38;                    // backward
      if (fam < 2.5) return  sin(t * 0.35 + seed) * 1.4;  // oscillating
      return t * 0.9;                                     // inward, faster
    }
    void main() {
      float phase = vMeta.x * 9.0 + vMeta.z * 6.2831 - timeDir(vMeta.y, uTime, vMeta.z);
      float f = fract(phase);
      float pulse = smoothstep(0.0, 0.06, f) * smoothstep(0.60, 0.10, f);
      float depthFade = smoothstep(235.0, 14.0, vDepth);
      float alpha = depthFade * (0.20 + 0.62 * pulse);
      vec3 col = mix(uGold, uDeep, pulse * 0.9);
      col = mix(uPaper, col, min(depthFade * 1.25, 1.0));
      gl_FragColor = vec4(col, alpha);
    }
  `);

  const nodeProg = compile(`
    attribute vec3 aPos;
    attribute float aSeed;
    uniform mat4 uMVP;
    uniform vec3 uCam;
    varying float vSeed;
    varying float vDepth;
    void main() {
      vSeed = aSeed;
      vDepth = distance(aPos, uCam);
      gl_PointSize = 300.0 / max(vDepth, 1.0);
      gl_Position = uMVP * vec4(aPos, 1.0);
    }
  `, `
    precision mediump float;
    uniform float uTime;
    uniform vec3 uPaper; uniform vec3 uDeep;
    varying float vSeed;
    varying float vDepth;
    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float disk = smoothstep(0.5, 0.10, length(uv));
      float tw = 0.55 + 0.45 * sin(uTime * 0.6 + vSeed);
      float depthFade = smoothstep(235.0, 14.0, vDepth);
      gl_FragColor = vec4(mix(uPaper, uDeep, depthFade), disk * depthFade * 0.55 * tw);
    }
  `);

  function buffer(data) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return b;
  }

  const bLinePos = buffer(linePos);
  const bLineMeta = buffer(lineMeta);
  const bNodePos = buffer(nodePos);
  const bNodeSeed = buffer(nodeSeed);
  const nLineVerts = linePos.length / 3;
  const nNodes = nodePos.length / 3;

  const L = {
    aPos: gl.getAttribLocation(lineProg, 'aPos'),
    aMeta: gl.getAttribLocation(lineProg, 'aMeta'),
    uMVP: gl.getUniformLocation(lineProg, 'uMVP'),
    uCam: gl.getUniformLocation(lineProg, 'uCam'),
    uTime: gl.getUniformLocation(lineProg, 'uTime'),
    uPaper: gl.getUniformLocation(lineProg, 'uPaper'),
    uGold: gl.getUniformLocation(lineProg, 'uGold'),
    uDeep: gl.getUniformLocation(lineProg, 'uDeep'),
  };
  const N = {
    aPos: gl.getAttribLocation(nodeProg, 'aPos'),
    aSeed: gl.getAttribLocation(nodeProg, 'aSeed'),
    uMVP: gl.getUniformLocation(nodeProg, 'uMVP'),
    uCam: gl.getUniformLocation(nodeProg, 'uCam'),
    uTime: gl.getUniformLocation(nodeProg, 'uTime'),
    uPaper: gl.getUniformLocation(nodeProg, 'uPaper'),
    uDeep: gl.getUniformLocation(nodeProg, 'uDeep'),
  };

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(PAPER[0], PAPER[1], PAPER[2], 1);

  // ---------------------------------------------------------------- mat4

  function perspective(fovY, aspect, near, far, out) {
    const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
    out.set([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function multiply(a, b, out) { // out = a * b (column-major)
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  const proj = new Float32Array(16), view = new Float32Array(16),
    mvp = new Float32Array(16), tmp = new Float32Array(16);

  function viewMatrix(cx, cy, cz, rx, ry, rz, out) {
    // inverse of T(c) * Ry * Rx * Rz  →  Rz' * Rx' * Ry' * T(-c)
    const cX = Math.cos(-rx), sX = Math.sin(-rx);
    const cY = Math.cos(-ry), sY = Math.sin(-ry);
    const cZ = Math.cos(-rz), sZ = Math.sin(-rz);
    // R = Rz(-rz) * Rx(-rx) * Ry(-ry)
    const r00 = cZ * cY + sZ * sX * sY, r01 = sZ * cX, r02 = -cZ * sY + sZ * sX * cY;
    const r10 = -sZ * cY + cZ * sX * sY, r11 = cZ * cX, r12 = sZ * sY + cZ * sX * cY;
    const r20 = cX * sY, r21 = -sX, r22 = cX * cY;
    out.set([
      r00, r10, r20, 0,
      r01, r11, r21, 0,
      r02, r12, r22, 0,
      -(r00 * cx + r01 * cy + r02 * cz),
      -(r10 * cx + r11 * cy + r12 * cz),
      -(r20 * cx + r21 * cy + r22 * cz), 1,
    ]);
  }

  // ---------------------------------------------------------------- frame

  const CAM_START = 34, CAM_TRAVEL = 135;
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

  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    W = Math.round(window.innerWidth * dpr);
    H = Math.round(window.innerHeight * dpr);
    canvas.width = W; canvas.height = H;
    perspective(52 * Math.PI / 180, W / H, 0.1, 500, proj);
  }
  window.addEventListener('resize', resize);
  resize();
  readScroll();

  function render(t) {
    curX += (mouseX - curX) * 0.03;
    curY += (mouseY - curY) * 0.03;
    const cx = curX * 3.2 + Math.sin(t * 0.05) * 1.6;
    const cy = -curY * 2.2 + Math.cos(t * 0.04) * 1.2;
    const cz = CAM_START - scrollP * CAM_TRAVEL;
    const rx = curY * 0.035;
    const ry = -curX * 0.045;
    const rz = scrollP * 0.22 + Math.sin(t * 0.03) * 0.015;

    viewMatrix(cx, cy, cz, rx, ry, rz, view);
    multiply(proj, view, mvp);

    gl.viewport(0, 0, W, H);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(lineProg);
    gl.uniformMatrix4fv(L.uMVP, false, mvp);
    gl.uniform3f(L.uCam, cx, cy, cz);
    gl.uniform1f(L.uTime, t);
    gl.uniform3fv(L.uPaper, PAPER);
    gl.uniform3fv(L.uGold, GOLD);
    gl.uniform3fv(L.uDeep, DEEP);
    gl.bindBuffer(gl.ARRAY_BUFFER, bLinePos);
    gl.enableVertexAttribArray(L.aPos);
    gl.vertexAttribPointer(L.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bLineMeta);
    gl.enableVertexAttribArray(L.aMeta);
    gl.vertexAttribPointer(L.aMeta, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, nLineVerts);

    gl.useProgram(nodeProg);
    gl.uniformMatrix4fv(N.uMVP, false, mvp);
    gl.uniform3f(N.uCam, cx, cy, cz);
    gl.uniform1f(N.uTime, t);
    gl.uniform3fv(N.uPaper, PAPER);
    gl.uniform3fv(N.uDeep, DEEP);
    gl.bindBuffer(gl.ARRAY_BUFFER, bNodePos);
    gl.enableVertexAttribArray(N.aPos);
    gl.vertexAttribPointer(N.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bNodeSeed);
    gl.enableVertexAttribArray(N.aSeed);
    gl.vertexAttribPointer(N.aSeed, 1, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, nNodes);
  }

  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !reduceMotion) requestAnimationFrame(tick);
  });

  const t0 = performance.now();
  function tick() {
    if (!running) return;
    render((performance.now() - t0) / 1000);
    requestAnimationFrame(tick);
  }

  if (reduceMotion) {
    render(8);
    window.addEventListener('scroll', () => render(8), { passive: true });
    window.addEventListener('resize', () => render(8));
  } else {
    requestAnimationFrame(tick);
  }
})();
