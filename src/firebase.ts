import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase yapılandırması - Demo değerler
// Gerçek projede bu bilgileri .env dosyasından alın
const firebaseConfig = {
  apiKey: "AIzaSyDemoKey123456789",
  authDomain: "padel-mexicano-demo.firebaseapp.com", 
  databaseURL: "https://padel-mexicano-demo-default-rtdb.firebaseio.com/",
  projectId: "padel-mexicano-demo",
  storageBucket: "padel-mexicano-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Database referansını export et
export const database = getDatabase(app);