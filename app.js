import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, where, serverTimestamp, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD-tJj29vReBh5viE0QKXHfEFe0leTcpgw",
  authDomain: "clone-hen.firebaseapp.com",
  projectId: "clone-hen",
  storageBucket: "clone-hen.firebasestorage.app",
  messagingSenderId: "1059956276936",
  appId: "1:1059956276936:web:1ac02fa0c59e5a8d096ffd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// State
let currentUser = null;
let currentChatId = null;
let unsubscribeMessages = null;
let chatsData = [];

// Elements
const loginModal = document.getElementById('login-modal');
const stepPhone = document.getElementById('step-phone');
const stepOtp = document.getElementById('step-otp');
const phoneInput = document.getElementById('phone-input');
const otpInput = document.getElementById('otp-input');
const sendOtpBtn = document.getElementById('send-otp-btn');
const verifyOtpBtn = document.getElementById('verify-otp-btn');
const chatListEl = document.getElementById('chat-list');
const messagesContainer = document.getElementById('messages-container');

// Auth Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loginModal.classList.remove('active');
        document.getElementById('current-chat-name').innerText = "Select a chat";
        document.querySelector('.user-name').innerText = user.phoneNumber;
        
        // Save user to DB
        await setDoc(doc(db, "users", user.uid), {
            phoneNumber: user.phoneNumber,
            lastSeen: serverTimestamp()
        }, { merge: true });
        
        loadChats();
    } else {
        loginModal.classList.add('active');
        setupRecaptcha();
    }
});

// Phone Auth Logic
function setupRecaptcha() {
    if(!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'normal',
            'callback': (response) => {
                // reCAPTCHA solved
            }
        });
    }
}

sendOtpBtn.addEventListener('click', () => {
    const phoneNumber = phoneInput.value.trim();
    if (!phoneNumber) return alert("Please enter phone number");
    
    sendOtpBtn.innerText = "Sending...";
    signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)
    .then((confirmationResult) => {
        window.confirmationResult = confirmationResult;
        stepPhone.style.display = 'none';
        stepOtp.style.display = 'block';
    }).catch((error) => {
        console.error("SMS not sent", error);
        alert("Error: " + error.message);
        sendOtpBtn.innerText = "Proceed";
    });
});

verifyOtpBtn.addEventListener('click', () => {
    const code = otpInput.value.trim();
    if (!code) return alert("Please enter OTP");
    
    verifyOtpBtn.innerText = "Verifying...";
    window.confirmationResult.confirm(code).then((result) => {
        // User signed in successfully (handled by onAuthStateChanged)
    }).catch((error) => {
        console.error("Bad verification code", error);
        alert("Invalid OTP");
        verifyOtpBtn.innerText = "Verify";
    });
});

// Chat Logic
function loadChats() {
    const q = query(collection(db, "chats"), where("participants", "array-contains", currentUser.phoneNumber));
    onSnapshot(q, (snapshot) => {
        chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort by latest message time
        chatsData.sort((a, b) => (b.lastUpdated?.toMillis() || 0) - (a.lastUpdated?.toMillis() || 0));
        
        renderChatList();
    });
}

function renderChatList() {
    chatListEl.innerHTML = '';
    chatsData.forEach(chat => {
        const otherParticipant = chat.participants.find(p => p !== currentUser.phoneNumber) || currentUser.phoneNumber;
        const item = document.createElement('div');
        item.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        item.onclick = () => selectChat(chat.id, otherParticipant);
        
        let timeString = "";
        if (chat.lastUpdated) {
            const d = chat.lastUpdated.toDate();
            timeString = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        item.innerHTML = `
            <img src="https://ui-avatars.com/api/?name=${otherParticipant.replace('+','')}&background=random&color=fff&rounded=true" class="avatar" alt="Avatar">
            <div class="chat-info">
                <div class="chat-header-row">
                    <span class="chat-name">${otherParticipant}</span>
                    <span class="chat-time">${timeString}</span>
                </div>
                <div class="chat-last-msg">${chat.lastMessage || 'New Chat'}</div>
            </div>
        `;
        chatListEl.appendChild(item);
    });
}

function selectChat(id, otherParticipantName) {
    currentChatId = id;
    renderChatList();
    
    document.getElementById('current-chat-name').innerText = otherParticipantName;
    document.getElementById('current-chat-avatar').src = `https://ui-avatars.com/api/?name=${otherParticipantName.replace('+','')}&background=random&color=fff&rounded=true`;
    
    // Switch to chat view on mobile
    document.querySelector('.app-container').classList.add('chat-active');
    
    if (unsubscribeMessages) unsubscribeMessages();
    
    const q = query(collection(db, `chats/${id}/messages`), orderBy("timestamp"));
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        messagesContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const msg = doc.data();
            const type = msg.sender === currentUser.phoneNumber ? "sent" : "received";
            const time = msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "";
            
            const msgEl = document.createElement('div');
            msgEl.className = `message ${type}`;
            msgEl.innerHTML = `${msg.text} <span class="msg-time">${time}</span>`;
            messagesContainer.appendChild(msgEl);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// Send Message
const sendBtn = document.getElementById('send-btn');
const inputField = document.getElementById('message-input');

async function sendMessage() {
    const text = inputField.value.trim();
    if (!text || !currentChatId) return;
    
    inputField.value = '';
    
    await addDoc(collection(db, `chats/${currentChatId}/messages`), {
        text: text,
        sender: currentUser.phoneNumber,
        timestamp: serverTimestamp()
    });
    
    await setDoc(doc(db, "chats", currentChatId), {
        lastMessage: text,
        lastUpdated: serverTimestamp()
    }, { merge: true });
}

sendBtn.addEventListener('click', sendMessage);
inputField.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') sendMessage();
});

// Mobile Back Button
const backBtn = document.getElementById('back-btn');
backBtn.addEventListener('click', () => {
    document.querySelector('.app-container').classList.remove('chat-active');
});

// New Chat Button
const newChatBtn = document.getElementById('new-chat-btn');
const newChatModal = document.getElementById('new-chat-modal');
const cancelNewChatBtn = document.getElementById('cancel-new-chat-btn');
const confirmNewChatBtn = document.getElementById('confirm-new-chat-btn');
const newContactNameInput = document.getElementById('new-contact-name');

newChatBtn.addEventListener('click', () => {
    newContactNameInput.placeholder = "Enter exact phone number (e.g. +123456)";
    newChatModal.classList.add('active');
    newContactNameInput.focus();
});

cancelNewChatBtn.addEventListener('click', () => {
    newChatModal.classList.remove('active');
    newContactNameInput.value = '';
});

confirmNewChatBtn.addEventListener('click', async () => {
    const phone = newContactNameInput.value.trim();
    if (phone) {
        // Check if chat already exists
        const existingChat = chatsData.find(c => c.participants.includes(phone));
        if (existingChat) {
            selectChat(existingChat.id, phone);
        } else {
            // Create new chat
            const newChatRef = await addDoc(collection(db, "chats"), {
                participants: [currentUser.phoneNumber, phone],
                lastMessage: "",
                lastUpdated: serverTimestamp()
            });
            selectChat(newChatRef.id, phone);
        }
        
        newContactNameInput.value = '';
        newChatModal.classList.remove('active');
    }
});

// Video Call modal toggle (mock)
const videoBtn = document.getElementById('video-call-btn');
const callModal = document.getElementById('call-modal');
const endCallBtn = document.getElementById('end-call-btn');

videoBtn.addEventListener('click', () => {
    callModal.classList.add('active');
});
endCallBtn.addEventListener('click', () => {
    callModal.classList.remove('active');
});
