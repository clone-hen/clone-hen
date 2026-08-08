const mockChats = [
    { id: 1, name: "Alice Smith", lastMsg: "See you later!", time: "10:45 AM", avatar: "FF6B6B", active: true },
    { id: 2, name: "Bob Johnson", lastMsg: "Can you send the files?", time: "Yesterday", avatar: "4D96FF" },
    { id: 3, name: "Design Team", lastMsg: "The new UI looks great.", time: "Tuesday", avatar: "6BCB77" },
    { id: 4, name: "Mom", lastMsg: "Call me when you're home.", time: "Monday", avatar: "FF9F45" }
];

const mockMessages = {
    1: [
        { text: "Hey! Are we still on for lunch?", type: "received", time: "10:30 AM" },
        { text: "Yes, I'll be there in 15 mins.", type: "sent", time: "10:32 AM" },
        { text: "Awesome. See you later!", type: "received", time: "10:45 AM" }
    ]
};

let currentChatId = 1;

document.addEventListener('DOMContentLoaded', () => {
    renderChatList();
    renderMessages();
    setupEventListeners();
});

function renderChatList() {
    const chatListEl = document.getElementById('chat-list');
    chatListEl.innerHTML = '';

    mockChats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        item.onclick = () => selectChat(chat.id);
        
        item.innerHTML = `
            <img src="https://ui-avatars.com/api/?name=${chat.name.replace(' ','+')}&background=${chat.avatar}&color=fff&rounded=true" class="avatar" alt="${chat.name}">
            <div class="chat-info">
                <div class="chat-header-row">
                    <span class="chat-name">${chat.name}</span>
                    <span class="chat-time">${chat.time}</span>
                </div>
                <div class="chat-last-msg">${chat.lastMsg}</div>
            </div>
        `;
        chatListEl.appendChild(item);
    });
}

function selectChat(id) {
    currentChatId = id;
    renderChatList();
    
    // Update Header
    const chat = mockChats.find(c => c.id === id);
    if(chat) {
        document.getElementById('current-chat-name').innerText = chat.name;
        document.getElementById('current-chat-avatar').src = `https://ui-avatars.com/api/?name=${chat.name.replace(' ','+')}&background=${chat.avatar}&color=fff&rounded=true`;
    }
    
    if(!mockMessages[id]) {
        mockMessages[id] = [{ text: "Hello there!", type: "received", time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }];
    }
    
    renderMessages();
    
    // Switch to chat view on mobile
    document.querySelector('.app-container').classList.add('chat-active');
}

function renderMessages() {
    const container = document.getElementById('messages-container');
    container.innerHTML = '';
    
    const messages = mockMessages[currentChatId] || [];
    
    messages.forEach(msg => {
        const msgEl = document.createElement('div');
        msgEl.className = `message ${msg.type}`;
        msgEl.innerHTML = `
            ${msg.text}
            <span class="msg-time">${msg.time}</span>
        `;
        container.appendChild(msgEl);
    });
    
    container.scrollTop = container.scrollHeight;
}

function setupEventListeners() {
    const sendBtn = document.getElementById('send-btn');
    const inputField = document.getElementById('message-input');
    
    const sendMessage = () => {
        const text = inputField.value.trim();
        if(text !== "") {
            const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Add sent message
            mockMessages[currentChatId].push({ text, type: "sent", time });
            inputField.value = '';
            renderMessages();
            
            // Update last msg in sidebar
            const chat = mockChats.find(c => c.id === currentChatId);
            if(chat) { chat.lastMsg = text; chat.time = time; renderChatList(); }
            
            // Simulate auto-reply
            setTimeout(() => {
                const replies = ["Got it!", "Sounds good.", "Okay.", "I'll check it out.", "Thanks!"];
                const reply = replies[Math.floor(Math.random() * replies.length)];
                mockMessages[currentChatId].push({ text: reply, type: "received", time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
                if(chat) { chat.lastMsg = reply; chat.time = time; renderChatList(); }
                renderMessages();
            }, 1500);
        }
    };
    
    sendBtn.addEventListener('click', sendMessage);
    inputField.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sendMessage();
    });

    // Video Call Modal logic
    const videoBtn = document.getElementById('video-call-btn');
    const modal = document.getElementById('call-modal');
    const endCallBtn = document.getElementById('end-call-btn');

    videoBtn.addEventListener('click', () => {
        modal.classList.add('active');
        // Play ringtone audio here if we had one
    });

    endCallBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // New Chat logic
    const newChatBtn = document.getElementById('new-chat-btn');
    const newChatModal = document.getElementById('new-chat-modal');
    const cancelNewChatBtn = document.getElementById('cancel-new-chat-btn');
    const confirmNewChatBtn = document.getElementById('confirm-new-chat-btn');
    const newContactNameInput = document.getElementById('new-contact-name');

    newChatBtn.addEventListener('click', () => {
        newChatModal.classList.add('active');
        newContactNameInput.focus();
    });

    cancelNewChatBtn.addEventListener('click', () => {
        newChatModal.classList.remove('active');
        newContactNameInput.value = '';
    });

    confirmNewChatBtn.addEventListener('click', () => {
        const name = newContactNameInput.value.trim();
        if (name) {
            const newId = mockChats.length ? Math.max(...mockChats.map(c => c.id)) + 1 : 1;
            const avatars = ["FF6B6B", "4D96FF", "6BCB77", "FF9F45", "845EC2", "00C9A7", "0D8ABC"];
            const avatar = avatars[Math.floor(Math.random() * avatars.length)];
            
            mockChats.unshift({
                id: newId,
                name: name,
                lastMsg: "New contact added",
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                avatar: avatar,
                active: true
            });
            
            mockMessages[newId] = [];
            
            newContactNameInput.value = '';
            newChatModal.classList.remove('active');
            
            selectChat(newId);
        }
    });

    // Mobile back button logic
    const backBtn = document.getElementById('back-btn');
    backBtn.addEventListener('click', () => {
        document.querySelector('.app-container').classList.remove('chat-active');
    });
}
