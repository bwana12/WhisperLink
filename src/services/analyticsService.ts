import { db } from '../lib/firebase';
import { doc, setDoc, increment, updateDoc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';

export async function trackVisit(userId: string) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const analyticsId = `${userId}_${today}`;
  const analyticsRef = doc(db, 'analytics', analyticsId);

  try {
    const docSnap = await getDoc(analyticsRef);
    if (!docSnap.exists()) {
      await setDoc(analyticsRef, {
        userId,
        date: today,
        visits: 1,
        messagesReceived: 0
      });
    } else {
      await updateDoc(analyticsRef, {
        visits: increment(1)
      });
    }
  } catch (error) {
    console.error('Error tracking visit:', error);
  }
}

export async function trackMessage(userId: string) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const analyticsId = `${userId}_${today}`;
  const analyticsRef = doc(db, 'analytics', analyticsId);

  try {
    const docSnap = await getDoc(analyticsRef);
    if (!docSnap.exists()) {
      await setDoc(analyticsRef, {
        userId,
        date: today,
        visits: 0,
        messagesReceived: 1
      });
    } else {
      await updateDoc(analyticsRef, {
        messagesReceived: increment(1)
      });
    }
  } catch (error) {
    console.error('Error tracking message:', error);
  }
}
