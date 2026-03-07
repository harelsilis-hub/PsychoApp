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
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push not supported in this browser');
  }

  const { data } = await apiClient.get('/v1/push/vapid-public-key');
  const publicKey = data.publicKey;
  if (!publicKey) throw new Error('VAPID public key not configured on server');

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  if (typeof Notification === 'undefined') throw new Error('Notifications not supported in this browser');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permission denied');

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const { endpoint, keys } = subscription.toJSON();
  await apiClient.post('/v1/push/subscribe', { endpoint, keys });
}
