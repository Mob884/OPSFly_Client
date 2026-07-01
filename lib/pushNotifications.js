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

export async function sendPushNotification(userId, title, body, data = {}) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.warn(`[FCM Push Service] User ${userId} not found`);
      return;
    }

    const token = user.fcmToken;
    if (!token) {
      console.log(`[FCM Push Service] User ${user.name} (${userId}) has no registered FCM token. Notification logged: "${title}: ${body}"`);
      return;
    }

    const stringifiedData = {};
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
          stringifiedData[key] = String(value);
        }
      }
    }

    console.log(`[FCM Push Service] Preparing to send push notification to ${user.name} (${token}): "${title}: ${body}"`);

    const hasFirebase = initFirebase();
    if (!hasFirebase) {
      console.log(`[FCM Push Service] [MOCK SEND] Token: ${token} | Title: ${title} | Body: ${body} | Data:`, stringifiedData);
      return;
    }

    const message = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
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

    const response = await admin.messaging().send(message);
    console.log(`✅ [FCM Push Service] FCM sent:`, response);
    return response;
  } catch (error) {
    console.error(`❌ [FCM Push Service] FCM error for user ${userId}:`, error.message);
  }
}
