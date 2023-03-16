const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');

admin.initializeApp();

// Twilio account SID and auth token
const client = twilio('API_KEY', 'AUTH_TOKEN');

const messagingServiceSid = 'INSERT';

// Firestore collection
const usersCollection = 'users1';


exports.twilioWebhook = functions.https.onRequest(async (req, res) => {
  const body = req.body;
  
  // Check if the message body contains the keyword "dua"
  if (body.Body.toLowerCase().includes('dua')) {
    const phoneNumber = body.From;
    
    // Check if the user is already subscribed
    const userRef = admin.firestore().collection(usersCollection).doc(phoneNumber);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      // User is already subscribed, send a message
      client.messages.create({
        body: 'You are already subscribed to DuaDaily!\n\nReply QUIT to unsubscribe.',
        to: phoneNumber,
        from: '+PHONE NUMBER',
        messagingServiceSid: messagingServiceSid
      });
    } else {
      // Add the phone number to the Firestore collection
      await userRef.set({
        phone: phoneNumber,
        index: 1
      });
    
      // Send a confirmation message back to the user
      client.messages.create({
        body: "Welcome to DuaDaily. Stay tuned for a dua sent to your phone every day at 9:00AM EST.\n\nReply QUIT to unsubscribe.",
        to: phoneNumber,
        from: '+PHONE NUMBER',
        messagingServiceSid: messagingServiceSid
      });
    }
  } else if (body.Body.toLowerCase().includes('quit')) {
    const phoneNumber = body.From;
    
    // Check if the user is subscribed
    const userRef = admin.firestore().collection(usersCollection).doc(phoneNumber);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      // User is subscribed, remove them from the Firestore collection
      await userRef.delete();
      
      // Send a confirmation message back to the user
      client.messages.create({
        body: 'You have been unsubscribed from DuaDaily.',
        to: phoneNumber,
        from: '+PHONE NUMBER',
        messagingServiceSid: messagingServiceSid
      });
    } else {
      // User is not subscribed, send a message
      client.messages.create({
        body: 'You are not subscribed to DuaDaily.',
        to: phoneNumber,
        from: '+PHONE NUMBER',
        messagingServiceSid: messagingServiceSid
      });
    }
  }
  
  res.status(200).end();
});