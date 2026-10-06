/* A small, self-contained keepsake renderer. No remote assets are required. */

const PAPER = '#fff8ec';
const INK = '#20364b';
const CORAL = '#c47c7f';
const GOLD = '#c7a575';
const SERIF = 'Georgia, "Times New Roman", serif';
const SCRIPT = '"Segoe Script", "Apple Chancery", "URW Chancery L", cursive';
const WIDTH = 1000;
const MARGIN = 70;
const CONTENT = WIDTH - MARGIN * 2;

function textOf(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join(' · ');
    return textOf(value.label ?? value.name ?? value.text ?? value.value ?? '');
  }
  return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
}

function pretty(value) {
  const text = textOf(value);
  if (!text || /\s/.test(text)) return text;
  return text.replace(/[_-]+/g, ' ').replace(/^\p{Ll}/u, (letter) => letter.toUpperCase());
}

function distanceText(value) {
  // The journey slider stores closeness on a 0–100 scale. Preserve its human
  // labels in the keepsake instead of displaying an unexplained raw number.
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100) {
    return value < 20 ? 'Very far' : value < 40 ? 'A little distant' : value < 65 ? 'Somewhere in between' : value < 88 ? 'Close' : 'Right beside you';
  }
  return pretty(value);
}

function displayDate(value) {
  const text = textOf(value);
  if (text && !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(text)) return text;
  const date = value instanceof Date ? value : text ? new Date(text.length === 10 ? `${text}T12:00:00` : text) : new Date();
  if (Number.isNaN(date.getTime())) return text || 'A day to remember';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function namesOf(data) {
  if (Array.isArray(data.names)) return data.names.map(textOf).filter(Boolean).join(' & ');
  if (data.names && typeof data.names === 'object') {
    return [data.names.left ?? data.names.first ?? data.names.you, data.names.right ?? data.names.second ?? data.names.them]
      .map(textOf).filter(Boolean).join(' & ');
  }
  return textOf(data.names) || [data.name1, data.name2].map(textOf).filter(Boolean).join(' & ');
}

function surface(width = WIDTH, height = 1) {
  let canvas;
  if (typeof document !== 'undefined') canvas = document.createElement('canvas');
  else if (typeof OffscreenCanvas !== 'undefined') canvas = new OffscreenCanvas(width, height);
  else throw new Error('The memory card needs a browser with Canvas support.');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function font(ctx, size, style = '') {
  ctx.font = `${style ? `${style} ` : ''}${size}px ${SERIF}`;
}

function graphemes(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (part) => part.segment);
  }
  return Array.from(text);
}

// Hard-wrap a single long word as well as ordinary prose. Explicit paragraphs
// survive wrapping, and no answer is truncated to an arbitrary character limit.
function wrap(ctx, text, maxWidth) {
  const output = [];
  for (const paragraph of textOf(text).replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph.trim()) {
      output.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const proposed = line ? `${line} ${word}` : word;
      if (ctx.measureText(proposed).width <= maxWidth) {
        line = proposed;
        continue;
      }
      if (line) output.push(line);
      line = '';
      if (ctx.measureText(word).width <= maxWidth) {
        line = word;
        continue;
      }
      for (const character of graphemes(word)) {
        if (line && ctx.measureText(line + character).width > maxWidth) {
          output.push(line);
          line = '';
        }
        line += character;
      }
    }
    if (line) output.push(line);
  }
  return output.length ? output : [''];
}

function lines(ctx, content, x, y, lineHeight, color = INK, align = 'left') {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  content.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
}

function roundedPath(ctx, x, y, w, h, radius = 22) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, fill = '#fffcf6', radius = 22) {
  roundedPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = '#deccb7';
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

function star(ctx, x, y, size = 9, color = GOLD) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * .12, -size * .12, size, 0);
  ctx.quadraticCurveTo(size * .12, size * .12, 0, size);
  ctx.quadraticCurveTo(-size * .12, size * .12, -size, 0);
  ctx.quadraticCurveTo(-size * .12, -size * .12, 0, -size);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function heart(ctx, x, y, size = 13, color = CORAL) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, size * .65);
  ctx.bezierCurveTo(-size * 1.4, -size * .2, -size * .75, -size, 0, -size * .35);
  ctx.bezierCurveTo(size * .75, -size, size * 1.4, -size * .2, 0, size * .65);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function ornament(ctx, y) {
  ctx.strokeStyle = '#d9c3a8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(345, y);
  ctx.lineTo(463, y);
  ctx.moveTo(537, y);
  ctx.lineTo(655, y);
  ctx.stroke();
  heart(ctx, 500, y, 12);
  star(ctx, 478, y, 4);
  star(ctx, 522, y, 4);
}

function spacedText(ctx, text, centerX, y, spacing = 2) {
  const characters = graphemes(text);
  const width = characters.reduce((total, letter) => total + ctx.measureText(letter).width, 0) + Math.max(0, characters.length - 1) * spacing;
  let x = centerX - width / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  characters.forEach((letter) => {
    ctx.fillText(letter, x, y);
    x += ctx.measureText(letter).width + spacing;
  });
}

function spacedWidth(ctx, text, spacing = 2) {
  const characters = graphemes(text);
  return characters.reduce((total, letter) => total + ctx.measureText(letter).width, 0) + Math.max(0, characters.length - 1) * spacing;
}

function paper(ctx, height) {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, height);
  gradient.addColorStop(0, '#fffaf0');
  gradient.addColorStop(.5, PAPER);
  gradient.addColorStop(1, '#f9eedc');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, height);
  // A deterministic fine grain, drawn lightly enough to keep the writing crisp.
  let seed = 1439;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  ctx.fillStyle = 'rgba(116, 83, 53, .027)';
  for (let i = 0; i < Math.min(9000, height * 1.15); i++) ctx.fillRect(random() * WIDTH, random() * height, .7 + random(), .7 + random());
  roundedPath(ctx, 24, 24, WIDTH - 48, height - 48, 28);
  ctx.strokeStyle = '#cdb495';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  roundedPath(ctx, 32, 32, WIDTH - 64, height - 64, 23);
  ctx.strokeStyle = 'rgba(205,180,149,.55)';
  ctx.lineWidth = .7;
  ctx.stroke();
  [[58, 60], [942, 60], [58, height - 60], [942, height - 60]].forEach(([x, y]) => star(ctx, x, y, 8));
}

function penguin(ctx, x, y, scale, angle, scarf) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#d6b16d';
  ctx.beginPath(); ctx.ellipse(-31, 112, 25, 10, -.15, 0, Math.PI * 2); ctx.ellipse(31, 112, 25, 10, .15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#183448';
  ctx.beginPath(); ctx.ellipse(0, 0, 78, 116, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-77, 16, 20, 63, .42, 0, Math.PI * 2); ctx.ellipse(77, 16, 20, 63, -.42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffdf6';
  ctx.beginPath(); ctx.ellipse(0, 27, 57, 77, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-25, -42, 32, 35, -.12, 0, Math.PI * 2); ctx.ellipse(25, -42, 32, 35, .12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#143047';
  [-25, 25].forEach((eye) => { ctx.beginPath(); ctx.ellipse(eye, -45, 5, 8, 0, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#e0b174';
  ctx.beginPath(); ctx.moveTo(-12, -24); ctx.lineTo(12, -24); ctx.lineTo(0, -10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(211,145,143,.6)';
  [-39, 39].forEach((cheek) => { ctx.beginPath(); ctx.ellipse(cheek, -24, 13, 6, 0, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = scarf;
  roundedPath(ctx, -59, -5, 118, 20, 9); ctx.fill();
  roundedPath(ctx, 24, 5, 20, 57, 6); ctx.fill();
  ctx.restore();
}

function fallbackSelfie(ctx, x, y, w, h, accent) {
  const sky = ctx.createLinearGradient(x, y, x, y + h);
  sky.addColorStop(0, '#dce4ec');
  sky.addColorStop(.55, '#f7dfdc');
  sky.addColorStop(1, '#fffaf2');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,253,246,.72)';
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h, w * .8, h * .32, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 16; i++) star(ctx, x + 46 + ((i * 113) % (w - 92)), y + 28 + ((i * 43) % (h * .48)), i % 3 === 0 ? 5 : 2.5, '#fffdf8');
  const scale = Math.min(w / 600, h / 390);
  penguin(ctx, x + w * .405, y + h * .59, scale, -.085, CORAL);
  penguin(ctx, x + w * .605, y + h * .59, scale, .085, accent);
  heart(ctx, x + w / 2, y + h * .18, 22, CORAL);
}

async function loadSelfie(dataURL) {
  if (typeof dataURL !== 'string' || !/^data:image\//i.test(dataURL) || typeof Image === 'undefined') return null;
  return new Promise((resolve) => {
    const image = new Image();
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      image.onload = image.onerror = null;
      resolve(result);
    };
    const timer = setTimeout(() => finish(null), 12000);
    image.onload = () => finish(image.naturalWidth && image.naturalHeight ? image : null);
    image.onerror = () => finish(null);
    image.src = dataURL;
  });
}

function accentColor(value) {
  const color = textOf(value);
  // Only simple color values are accepted here; details still retain a named accent.
  if (/^#[\da-f]{3,8}$/i.test(color) || /^(?:pink|coral|rose|blue|lavender|purple|mint|gold|red|teal)$/i.test(color)) {
    const colors = { rose: '#bd7d91', lavender: '#a99abe', mint: '#8eb8aa', gold: '#c7a575' };
    return colors[color.toLowerCase()] || color;
  }
  return '#98adc0';
}

function measureLayout(ctx, data) {
  const layout = [];
  font(ctx, 16);
  const dateLines = wrap(ctx, data.date, CONTENT);
  layout.push({ type: 'date', y: 102, lines: dateLines });
  let y = 102 + dateLines.length * 21 + 10;
  ctx.font = `54px ${SCRIPT}`;
  const titleLines = wrap(ctx, data.title, CONTENT - 36);
  layout.push({ type: 'title', y, lines: titleLines });
  y += titleLines.length * 78 + 23;
  layout.push({ type: 'subtitle', y });
  y += 73;

  const captionParts = [data.names, data.accessory && `${pretty(data.accessory)}${data.pose ? ` · ${pretty(data.pose)}` : ''}`, !data.accessory && data.pose ? pretty(data.pose) : ''].filter(Boolean);
  font(ctx, 22, 'italic');
  const captionLines = captionParts.flatMap((part) => wrap(ctx, part, CONTENT - 80));
  const selfieHeight = 534 + (captionLines.length ? captionLines.length * 31 + 22 : 0);
  layout.push({ type: 'selfie', y, height: selfieHeight, captionLines });
  y += selfieHeight + 41;

  if (data.distance || data.finalDistance) {
    font(ctx, 27);
    const beginning = wrap(ctx, data.distance || 'A little space between us', 330);
    const ending = wrap(ctx, data.finalDistance || 'A little closer', 330);
    const height = 109 + Math.max(beginning.length, ending.length) * 38;
    layout.push({ type: 'distance', y, height, beginning, ending });
    y += height + 38;
  }

  if (data.answers.length) {
    ctx.font = `35px ${SCRIPT}`;
    const heading = wrap(ctx, 'The little things we learned', CONTENT - 24);
    layout.push({ type: 'heading', y, lines: heading });
    y += heading.length * 52 + 18;
    data.answers.forEach((answer, index) => {
      font(ctx, 24, 'italic');
      const question = wrap(ctx, answer.question || `A little thought ${index + 1}`, CONTENT - 100);
      font(ctx, 27);
      const response = wrap(ctx, answer.answer || 'A thought still waiting to be written.', CONTENT - 100);
      const height = 69 + question.length * 34 + response.length * 40;
      layout.push({ type: 'answer', y, height, question, response, index });
      y += height + 18;
    });
    y += 19;
  }

  if (data.moments.length) {
    ctx.font = `35px ${SCRIPT}`;
    const heading = wrap(ctx, 'The moments we’ll keep', CONTENT - 24);
    layout.push({ type: 'heading', y, lines: heading });
    y += heading.length * 52 + 18;
    font(ctx, 26);
    const moments = data.moments.map((moment) => wrap(ctx, moment, CONTENT - 116));
    const height = 37 + moments.reduce((total, moment) => total + moment.length * 38 + 20, 0);
    layout.push({ type: 'moments', y, height, moments });
    y += height + 42;
  }

  ctx.font = `35px ${SCRIPT}`;
  const noteHeading = wrap(ctx, 'A note for us', CONTENT - 110);
  font(ctx, 27, 'italic');
  const message = wrap(ctx, data.message || 'Wherever life takes us, I hope we keep finding our way back to each other.', CONTENT - 110);
  const noteHeight = 97 + noteHeading.length * 52 + message.length * 42;
  layout.push({ type: 'note', y, height: noteHeight, heading: noteHeading, message });
  y += noteHeight + 112;
  return { blocks: layout, height: y + 94 };
}

function paintLayout(ctx, data, layout, selfie) {
  paper(ctx, layout.height);
  ornament(ctx, 79);
  for (const block of layout.blocks) {
    if (block.type === 'date') {
      font(ctx, 16);
      ctx.fillStyle = '#8e7968';
      if (block.lines.length === 1 && spacedWidth(ctx, data.date.toUpperCase(), 1.4) < CONTENT) {
        spacedText(ctx, data.date.toUpperCase(), WIDTH / 2, block.y, 1.4);
      } else lines(ctx, block.lines, WIDTH / 2, block.y, 21, '#8e7968', 'center');
    } else if (block.type === 'title') {
      ctx.font = `54px ${SCRIPT}`;
      lines(ctx, block.lines, WIDTH / 2, block.y, 78, INK, 'center');
    } else if (block.type === 'subtitle') {
      font(ctx, 22, 'italic');
      lines(ctx, ['a little keepsake of us'], WIDTH / 2, block.y, 32, '#947566', 'center');
      star(ctx, 325, block.y + 13, 5);
      star(ctx, 675, block.y + 13, 5);
    } else if (block.type === 'selfie') {
      ctx.save();
      ctx.shadowColor = 'rgba(83,57,34,.12)';
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 10;
      panel(ctx, MARGIN, block.y, CONTENT, block.height, '#fffdf7', 20);
      ctx.restore();
      const x = MARGIN + 18, y = block.y + 18, w = CONTENT - 36, h = 498;
      ctx.save();
      roundedPath(ctx, x, y, w, h, 11);
      ctx.clip();
      if (selfie) {
        const background = ctx.createLinearGradient(x, y, x, y + h);
        background.addColorStop(0, '#e4e9ed');
        background.addColorStop(1, '#f1ded6');
        ctx.fillStyle = background;
        ctx.fillRect(x, y, w, h);
        const ratio = Math.min(w / selfie.naturalWidth, h / selfie.naturalHeight);
        const imageWidth = selfie.naturalWidth * ratio, imageHeight = selfie.naturalHeight * ratio;
        ctx.drawImage(selfie, x + (w - imageWidth) / 2, y + (h - imageHeight) / 2, imageWidth, imageHeight);
      } else fallbackSelfie(ctx, x, y, w, h, accentColor(data.accent));
      ctx.restore();
      if (block.captionLines.length) {
        font(ctx, 22, 'italic');
        lines(ctx, block.captionLines, WIDTH / 2, block.y + 536, 31, '#756557', 'center');
      }
      // A tiny color seal preserves the chosen accent without printing a hex code.
      ctx.fillStyle = accentColor(data.accent);
      ctx.beginPath(); ctx.arc(MARGIN + CONTENT - 15, block.y + 15, 10, 0, Math.PI * 2); ctx.fill();
      star(ctx, MARGIN + CONTENT - 15, block.y + 15, 4, '#fffaf2');
    } else if (block.type === 'distance') {
      panel(ctx, MARGIN, block.y, CONTENT, block.height, '#fbf3e9');
      font(ctx, 18, 'italic');
      lines(ctx, ['where we began'], 285, block.y + 26, 26, '#957363', 'center');
      lines(ctx, ['where we found ourselves'], 715, block.y + 26, 26, '#957363', 'center');
      font(ctx, 27);
      lines(ctx, block.beginning, 285, block.y + 65, 38, INK, 'center');
      lines(ctx, block.ending, 715, block.y + 65, 38, INK, 'center');
      const middle = block.y + block.height / 2;
      ctx.strokeStyle = '#d9aaa6';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.moveTo(465, middle); ctx.lineTo(535, middle); ctx.stroke();
      ctx.setLineDash([]);
      heart(ctx, 500, middle, 13);
    } else if (block.type === 'heading') {
      ctx.font = `35px ${SCRIPT}`;
      lines(ctx, block.lines, MARGIN + 8, block.y, 52);
    } else if (block.type === 'answer') {
      panel(ctx, MARGIN, block.y, CONTENT, block.height, block.index % 2 ? '#fbf3ed' : '#fffcf6');
      font(ctx, 13);
      ctx.fillStyle = CORAL;
      spacedText(ctx, `${String(block.index + 1).padStart(2, '0')}  /  A LITTLE DISCOVERY`, MARGIN + 175, block.y + 20, 1.2);
      font(ctx, 24, 'italic');
      lines(ctx, block.question, MARGIN + 50, block.y + 49, 34, '#967266');
      const responseY = block.y + 59 + block.question.length * 34;
      font(ctx, 27);
      lines(ctx, block.response, MARGIN + 50, responseY, 40);
      star(ctx, MARGIN + CONTENT - 27, block.y + 29, 6);
    } else if (block.type === 'moments') {
      panel(ctx, MARGIN, block.y, CONTENT, block.height);
      let momentY = block.y + 30;
      font(ctx, 26);
      block.moments.forEach((moment) => {
        heart(ctx, MARGIN + 42, momentY + 15, 8);
        lines(ctx, moment, MARGIN + 74, momentY, 38);
        momentY += moment.length * 38 + 20;
      });
    } else if (block.type === 'note') {
      panel(ctx, MARGIN, block.y, CONTENT, block.height, '#f6e8e2', 26);
      ctx.font = `35px ${SCRIPT}`;
      lines(ctx, block.heading, MARGIN + 55, block.y + 33, 52);
      const messageY = block.y + 48 + block.heading.length * 52;
      font(ctx, 27, 'italic');
      lines(ctx, block.message, MARGIN + 55, messageY, 42);
      heart(ctx, MARGIN + CONTENT - 37, block.y + 37, 10);
    }
  }
  ornament(ctx, layout.height - 118);
  font(ctx, 14);
  ctx.fillStyle = '#8a796b';
  spacedText(ctx, 'OUR LITTLE JOURNEY', WIDTH / 2, layout.height - 83, 2.2);
  font(ctx, 18, 'italic');
  lines(ctx, ['some moments are small enough to hold, and big enough to keep.'], WIDTH / 2, layout.height - 59, 25, '#998374', 'center');
}

async function pngBlob(canvas) {
  if (typeof canvas.convertToBlob === 'function') return canvas.convertToBlob({ type: 'image/png' });
  const blob = await new Promise((resolve, reject) => {
    try { canvas.toBlob(resolve, 'image/png'); }
    catch (error) { reject(error); }
  });
  if (blob) return blob;
  // Some older Safari versions return null from toBlob but still allow data URLs.
  const encoded = canvas.toDataURL('image/png').split(',')[1];
  if (!encoded) throw new Error('The browser could not create the memory image.');
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

/** Create a warm, full-length PNG keepsake, normally 1500 pixels wide. */
export async function createMemoryCard(input = {}, selfieDataURL) {
  const data = {
    title: textOf(input.title) || 'Our Little Journey',
    date: displayDate(input.date),
    names: namesOf(input),
    accessory: textOf(input.accessory),
    accent: textOf(input.accent),
    pose: textOf(input.pose),
    answers: (Array.isArray(input.answers) ? input.answers : []).map((answer) => ({ question: textOf(answer?.question), answer: textOf(answer?.answer) })),
    moments: (Array.isArray(input.moments) ? input.moments : []).map(textOf).filter(Boolean),
    distance: distanceText(input.distance),
    finalDistance: distanceText(input.finalDistance),
    message: textOf(input.message),
  };
  const selfiePromise = loadSelfie(selfieDataURL);
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1500))]);
  }
  const measuringCanvas = surface();
  const measuringContext = measuringCanvas.getContext('2d');
  if (!measuringContext) throw new Error('Canvas is unavailable in this browser.');
  const layout = measureLayout(measuringContext, data);
  // Keep unusually long writing inside mobile browser canvas limits. Ordinary
  // cards retain their 1500 px width; all text remains included for long cards.
  const scale = Math.min(1.5, Math.sqrt(16000000 / (WIDTH * layout.height)), 16000 / layout.height);
  const canvas = surface(Math.round(WIDTH * scale), Math.ceil(layout.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');
  ctx.scale(scale, scale);
  paintLayout(ctx, data, layout, await selfiePromise);
  return pngBlob(canvas);
}

/** Download through a visible anchor; Safari can use the same blob as an image. */
export function downloadBlob(blob, filename = 'our-little-journey.png') {
  if (!(blob instanceof Blob)) throw new TypeError('A memory image is required.');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  // A real, attached anchor is more reliable than an unattached click on Safari.
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Do not revoke immediately: Safari may begin reading the file after click.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return { downloaded: true, filename };
}

/** Use the native file share sheet, or save the PNG and return a WhatsApp link. */
export async function shareMemory(blob) {
  if (!(blob instanceof Blob)) throw new TypeError('A memory image is required.');
  const filename = 'our-little-journey.png';
  const shareText = 'A little keepsake from Our Little Journey 💛';
  const file = typeof File !== 'undefined' ? new File([blob], filename, { type: 'image/png' }) : null;
  let canShareFile = false;
  try { canShareFile = Boolean(file && typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })); }
  catch { /* Unsupported file sharing is a normal download fallback. */ }
  if (canShareFile) {
    try {
      await navigator.share({ files: [file], title: 'Our Little Journey', text: shareText });
      return { shared: true };
    } catch { return { cancelled: true }; }
  }
  downloadBlob(blob, filename);
  return {
    fallback: true,
    filename,
    url: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    instruction: 'Open WhatsApp, choose someone, and attach the saved memory image.',
  };
}
