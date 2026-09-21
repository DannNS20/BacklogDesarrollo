import type { GeoPoint } from '../../shared/contracts';

/** Ubicación del dispositivo para validar la geocerca del acceso */
export function getCurrentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Este dispositivo no permite compartir la ubicación.'));
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}

export function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/i.test(ua)) return 'iPhone o iPad (Face ID o Touch ID)';
  if (/Android/i.test(ua)) return 'Android (huella o rostro)';
  if (/Windows/i.test(ua)) return 'Windows Hello';
  if (/Macintosh/i.test(ua)) return 'Mac (Touch ID)';
  return 'Este dispositivo';
}
