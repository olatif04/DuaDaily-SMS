const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio')('API_KEY', 'AUTH_TOKEN');
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

const bucketName = 'BUCKET NAME';
const fileName = 'localization.json';

admin.initializeApp();

exports.sendDuaMessageToUsers = functions.pubsub.schedule('every day 9:00').onRun(async (context) => {
  try {
    const usersSnapshot = await admin.firestore().collection('users1').get();
    const users = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    const [fileExists] = await file.exists();

    if (!fileExists) {
      throw new Error(`File ${fileName} not found in bucket ${bucketName}.`);
    }

    const [fileContent] = await file.download();
    const azkar = JSON.parse(fileContent.toString()).azkar;

    const promises = users.map(async (user) => {
      const messageIndex = user.index;
      const message = `${azkar[messageIndex - 1].message}\n\nv2 will include translations.\n\nDonate to cover costs: https://paypal.me/omrltff.\n\nQUIT to unsubscribe.`;

      try {
        await twilio.messages.create({
          body: message,
          to: user.phone,
          from: '+PHONE NUMBER',
        });
        console.log(`Message sent successfully to ${user.phone}`);
      } catch (error) {
        console.error(`Error sending message to ${user.phone}: ${error}`);
      }

      // Update the user's index for the next message
      const newIndex = (user.index % azkar.length) + 1;
      await admin.firestore().collection('users1').doc(user.id).update({ index: newIndex });
    });

    await Promise.all(promises);
    console.log('All messages sent successfully');

    return null;
  } catch (error) {
    console.error('Error sending messages:', error);
    return null;
  }
});
