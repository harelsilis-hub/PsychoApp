import apiClient from './client';

export async function testPushNotification() {
  const { data } = await apiClient.post('/v1/push/test');
  return data;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const { data } = await apiClient.get('/v1/push/vapid-public-key');
    const publicKey = data.publicKey;
    if (!publicKey) return;

    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const { endpoint, keys } = subscription.toJSON();
    await apiClient.post('/v1/push/subscribe', { endpoint, keys });
  } catch (err) {
    console.warn('[Push] Subscribe failed:', err);
  }
}
