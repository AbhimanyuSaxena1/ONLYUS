import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('--- Generated VAPID Keys for OnlyUs Web Push ---');
console.log('Public Key:');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key:');
console.log(vapidKeys.privateKey);
console.log('\nAdd these to your server/.env file as:');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
