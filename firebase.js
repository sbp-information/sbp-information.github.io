// Firebase is deliberately loaded AFTER the local app shell has rendered.
 // Keep the entry module light: eager Firestore imports previously blocked all app.js execution.
 // Единая конфигурация Firebase проекта группы.
export const firebaseConfig = {
    apiKey: "AIzaSyDwFm2OB9BTKnGYmPG_siRsZoAh_cCMK2w",
    authDomain: "sbpgroup-toe-26-9-1.firebaseapp.com",
    projectId: "sbpgroup-toe-26-9-1",
    storageBucket: "sbpgroup-toe-26-9-1.firebasestorage.app",
    messagingSenderId: "984164177952",
    appId: "1:984164177952:web:c332ee08c78ce87b4b4445",
    measurementId: "G-V88BPGYH33"
};


let firebaseServices = null;
let firebaseLoadPromise = null;
let authSdk = null;
let firestoreSdk = null;
let functionsSdkPromise = null;
let functionsService = null;

// ESM live binding: callers read the real persistence object after await createFirebaseServices().
export let browserLocalPersistence = null;

export async function createFirebaseServices() {
  if (firebaseServices) return firebaseServices;
  if (!firebaseLoadPromise) {
    firebaseLoadPromise = Promise.all([
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
    ]).then(([appSdk, loadedAuth, loadedFirestore]) => {
      const app = appSdk.initializeApp(firebaseConfig);
      const auth = loadedAuth.getAuth(app);
      const db = loadedFirestore.getFirestore(app);
      authSdk = loadedAuth;
      firestoreSdk = loadedFirestore;
      browserLocalPersistence = authSdk.browserLocalPersistence;
      firebaseServices = { app, auth, db, functions: null };
      return firebaseServices;
    }).catch(error => {
      firebaseLoadPromise = null;
      throw error;
    });
  }
  return firebaseLoadPromise;
}

export async function callCloudFunction(name, data = {}) {
  if (!firebaseServices?.app) throw new Error('functions-not-initialized');
  if (!functionsSdkPromise) {
    functionsSdkPromise = import('https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js')
      .then(module => {
        functionsService = module.getFunctions(firebaseServices.app, 'us-central1');
        return module;
      })
      .catch(error => { functionsSdkPromise = null; throw error; });
  }
  const sdk = await functionsSdkPromise;
  const callable = sdk.httpsCallable(functionsService, name, { timeout: 10000 });
  const response = await callable(data);
  return response?.data;
}

// The named Firestore/Auth API remains synchronous after service creation.
// Reuse the initialized official SDK methods and preserve existing roles and listeners.
function authMethod(name, args) {
  if (!authSdk) throw new Error('Firebase Auth is not initialized');
  return authSdk[name](...args);
}
function firestoreMethod(name, args) {
  if (!firestoreSdk) throw new Error('Firebase Firestore is not initialized');
  return firestoreSdk[name](...args);
}

export const signInAnonymously = (...args) => authMethod('signInAnonymously', args);
export const signInWithEmailAndPassword = (...args) => authMethod('signInWithEmailAndPassword', args);
export const signOut = (...args) => authMethod('signOut', args);
export const onAuthStateChanged = (...args) => authMethod('onAuthStateChanged', args);
export const setPersistence = (...args) => authMethod('setPersistence', args);

export const doc = (...args) => firestoreMethod('doc', args);
export const setDoc = (...args) => firestoreMethod('setDoc', args);
export const getDoc = (...args) => firestoreMethod('getDoc', args);
export const collection = (...args) => firestoreMethod('collection', args);
export const getDocs = (...args) => firestoreMethod('getDocs', args);
export const onSnapshot = (...args) => firestoreMethod('onSnapshot', args);
export const updateDoc = (...args) => firestoreMethod('updateDoc', args);
export const deleteDoc = (...args) => firestoreMethod('deleteDoc', args);
export const deleteField = (...args) => firestoreMethod('deleteField', args);
export const writeBatch = (...args) => firestoreMethod('writeBatch', args);
export const serverTimestamp = (...args) => firestoreMethod('serverTimestamp', args);
export const query = (...args) => firestoreMethod('query', args);
export const orderBy = (...args) => firestoreMethod('orderBy', args);
export const limit = (...args) => firestoreMethod('limit', args);
