import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "smarttalk-75a97.firebaseapp.com",
  projectId: "smarttalk-75a97",
  storageBucket: "smarttalk-75a97.firebasestorage.app",
  messagingSenderId: "844179556040",
  appId: "1:844179556040:web:183076273910e76fcbc7fd",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

export { auth, provider };