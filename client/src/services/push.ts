import { apiClient } from './api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const isPushSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

export const registerPushSubscription = async (): Promise<boolean> => {
  if (!isPushSupported()) {
    console.warn('Web Push is not supported in this browser.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission was not granted:', permission);
      return false;
    }

    const registration = await navigator.serviceWorker.ready;

    // Get VAPID public key from backend
    const { data } = await apiClient.get('/push/vapid-key');
    const vapidKey = data.data.publicKey;

    if (!vapidKey) {
      console.warn('No VAPID public key returned from server.');
      return false;
    }

    // Subscribe to push notifications
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    // Send subscription to backend
    await apiClient.post('/push/subscribe', {
      subscription: subscription.toJSON(),
      deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
    });

    console.log('Successfully subscribed to Web Push notifications');
    return true;
  } catch (err) {
    console.error('Failed to subscribe to push notifications:', err);
    return false;
  }
};
