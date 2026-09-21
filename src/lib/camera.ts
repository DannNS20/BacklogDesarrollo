import type { GeoPoint } from '../../shared/contracts';

const MAX_WIDTH = 960;

/**
 * Redimensiona la imagen y le agrega una franja con los datos del registro.
 * La hora oficial siempre es la del servidor; la franja es solo una referencia visual.
 */
export function renderEvidence(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, lines: string[], mirror: boolean): string {
  const scale = Math.min(1, MAX_WIDTH / sourceWidth);
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen.');

  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, width, height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const fontSize = Math.max(12, Math.round(width / 50));
  const padding = Math.round(fontSize * 0.9);
  const lineHeight = fontSize * 1.4;
  const barHeight = padding * 2 + lineHeight * lines.length;

  ctx.fillStyle = 'rgba(8, 33, 19, 0.74)';
  ctx.fillRect(0, height - barHeight, width, barHeight);
  ctx.fillStyle = '#8cc63f';
  ctx.fillRect(0, height - barHeight, Math.round(width * 0.3), Math.max(3, Math.round(fontSize / 4)));
  ctx.fillStyle = '#c9692f';
  ctx.fillRect(Math.round(width * 0.3), height - barHeight, Math.round(width * 0.15), Math.max(3, Math.round(fontSize / 4)));

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  lines.forEach((line, index) => {
    ctx.font = `${index === 0 ? 700 : 500} ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(line, padding, height - barHeight + padding + index * lineHeight);
  });

  return canvas.toDataURL('image/jpeg', 0.82);
}

export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen seleccionada.'));
    };
    image.src = url;
  });
}

export function getCurrentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no disponible'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position =>
        resolve({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy),
        }),
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

export function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/i.test(ua)) return 'iPhone / iPad (Face ID o Touch ID)';
  if (/Android/i.test(ua)) return 'Android (huella o rostro)';
  if (/Windows/i.test(ua)) return 'Windows Hello';
  if (/Macintosh/i.test(ua)) return 'Mac (Touch ID)';
  return 'Este dispositivo';
}
