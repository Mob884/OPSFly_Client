import admin from 'firebase-admin';
import User from './User';

let initialized = false;

function initFirebase() {
  if (initialized) return true;

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.warn('[FCM Push Service] Warning: FIREBASE_SERVICE_ACCOUNT_KEY is not defined in environment variables. Push notifications will be logged to console instead of sending to real devices.');
    return false;
  }

  try {
    const serviceAccount = typeof serviceAccountKey === 'string' && serviceAccountKey.startsWith('{')
      ? JSON.parse(serviceAccountKey)
      : require(serviceAccountKey);
    
    // Check if app is already initialized to prevent Next.js hot reload duplicate app crashes
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    initialized = true;
    console.log('✅ [FCM Push Service] Firebase Admin initialized successfully');
    return true;
  } catch (err) {
    console.error('❌ [FCM Push Service] Failed to initialize Firebase Admin SDK:', err.message);
    return false;
  }
}

export function isFirebaseReady() {
  return initFirebase();
}

// Low-level send: given a raw FCM token, send a notification. Returns a
// diagnostic object rather than throwing, so callers (including the
// /api/test-push route) can report exactly what happened.
export async function sendToToken(token, title, body, data = {}) {
  const stringifiedData = {};
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        stringifiedData[key] = String(value);
      }
    }
  }

  const hasFirebase = initFirebase();
  if (!hasFirebase) {
    console.log(`[FCM Push Service] [MOCK SEND] Token: ${token} | Title: ${title} | Body: ${body} | Data:`, stringifiedData);
    return { sent: false, mocked: true, reason: 'FIREBASE_SERVICE_ACCOUNT_KEY not configured' };
  }

  const message = {
    token,
    notification: { title, body },
    data: stringifiedData,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        defaultSound: true,
        channelId: 'opsfly_notifications_high'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(`✅ [FCM Push Service] FCM sent:`, response);
    return { sent: true, mocked: false, messageId: response };
  } catch (error) {
    console.error(`❌ [FCM Push Service] FCM error:`, error.message);
    return { sent: false, mocked: false, error: error.message };
  }
}

export async function sendPushNotification(userId, title, body, data = {}) {
  const user = await User.findById(userId);
  if (!user) {
    console.warn(`[FCM Push Service] User ${userId} not found`);
    return { sent: false, reason: 'user_not_found' };
  }

  const token = user.fcmToken;
  if (!token) {
    console.log(`[FCM Push Service] User ${user.name} (${userId}) has no registered FCM token. Notification logged: "${title}: ${body}"`);
    return { sent: false, reason: 'no_token' };
  }

  console.log(`[FCM Push Service] Preparing to send push notification to ${user.name} (${token}): "${title}: ${body}"`);
  return sendToToken(token, title, body, data);
}
