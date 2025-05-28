// Generate user ID if new
let userId = localStorage.getItem('userId');
if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('userId', userId);
}

// Get or set username
let username = localStorage.getItem('username');
const usernameModal = document.getElementById('username-modal');
const usernameInput = document.getElementById('username-input');
const usernameSubmit = document.getElementById('username-submit');

// Show username modal if no username is set
if (!username) {
    usernameModal.classList.remove('hidden');
}

// Handle username submission
usernameSubmit.addEventListener('click', () => {
    handleUsernameSubmission();
});

// Add Enter key support for username input
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleUsernameSubmission();
    }
});

function handleUsernameSubmission() {
    const inputUsername = usernameInput.value.trim();
    if (inputUsername) {
        username = inputUsername;
        localStorage.setItem('username', username);
        usernameModal.classList.add('hidden');
        // Update profile menu with username
        document.querySelector('#profile-menu .text-black').textContent = `Username: ${username}`;
        // Add welcome message
        appendMessage(`Welcome to AFIYA, ${username}! How can I help you today?`, false);
    }
}

// DOM Elements
const sendButton = document.getElementById('send-button');
const askInput = document.getElementById('ask-input');
const chatContainer = document.getElementById('chat-container');
const menuIcon = document.getElementById('menu-icon');
const dropdownButton = document.getElementById('dropdown-button');
const dropdownMenu = document.getElementById('dropdown-menu');
const dropdownText = document.getElementById('dropdown-text');
const profileIcon = document.getElementById('profile-icon');
const profileMenu = document.getElementById('profile-menu');
const questionIcon = document.getElementById('question-icon');
const questionMenu = document.getElementById('question-menu');
const micIcon = document.getElementById('mic-icon');
const micStatus = document.getElementById('mic-status');
const sideMenu = document.getElementById('side-menu');
const closeBtn = document.querySelector('.close-btn');

// Event Listeners
sendButton.addEventListener('click', sendMessageHandler);
askInput.addEventListener('keypress', handleEnterKey);
dropdownButton.addEventListener('click', toggleDropdown);
profileIcon.addEventListener('click', toggleProfileMenu);
questionIcon.addEventListener('click', toggleQuestionMenu);
micIcon.addEventListener('click', toggleMicrophone);
menuIcon.addEventListener('click', toggleSideMenu);
closeBtn.addEventListener('click', closeSideMenu);
document.addEventListener('click', handleOutsideClicks);

// Mark session as "new" on app load
window.addEventListener("load", () => {
    sessionStorage.setItem("newSession", "true");
});

// Load existing messages when page loads
window.addEventListener('DOMContentLoaded', async () => {
    await loadChatHistory();
});

async function loadChatHistory() {
    try {
        const response = await fetch(`/api/past-conversations?userId=${encodeURIComponent(userId)}`);
        const conversations = await response.json();
        const historyList = document.querySelector('.history-list');
        historyList.innerHTML = conversations
            .map(conv => `
                <div class="history-item" onclick="loadConversation('${conv.conversationId}')">
                    <div>${conv.date}</div>
                    <time>${new Date(conv.messages[0].timestamp).toLocaleString()}</time>
                </div>
            `).join('');
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// HTML escaping function
function escapeHtml(unsafe) {
    return unsafe.replace(/[&<"'>]/g, (match) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[match]));
}

// Modern clipboard API implementation
async function copyCode(codeId) {
    try {
        const codeElement = document.getElementById(codeId);
        const text = codeElement.textContent;
        
        await navigator.clipboard.writeText(text);
        
        // Visual feedback
        const btn = document.querySelector(`button[data-codeid="${codeId}"]`);
        if (btn) {
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.classList.remove('copied');
            }, 2000);
        }
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

// Message Handling
function appendMessage(text, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message-bubble', isUser ? 'user-message' : 'server-message');
    
    const timestamp = new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    if (!isUser && text.includes('```')) {
        // Generate unique ID for each code block
        const codeId = `code-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Extract code content with language specification
        const codeMatch = text.match(/```(\w+)?\n([\s\S]*?)```/);
        if (codeMatch) {
            const [_, language, code] = codeMatch;
            const escapedCode = escapeHtml(code.trim());
            const displayLanguage = language || 'code';

            // Split text into parts: before code, code block, and after code
            const parts = text.split(/```(\w+)?\n[\s\S]*?```/);
            const beforeCode = parts[0];
            const afterCode = parts[parts.length - 1];

            messageDiv.innerHTML = `
                ${beforeCode ? `<span>${escapeHtml(beforeCode.trim())}</span><br>` : ''}
                <div class="code-block">
                    <div class="code-header">
                        <span class="code-language">${displayLanguage}</span>
                        <button class="copy-btn" data-codeid="${codeId}">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                    <pre><code id="${codeId}">${escapedCode}</code></pre>
                </div>
                ${afterCode ? `<br><span>${escapeHtml(afterCode.trim())}</span>` : ''}
                <time>${timestamp}</time>
            `;
            
            // Add click handler for the copy button
            const copyBtn = messageDiv.querySelector(`button[data-codeid="${codeId}"]`);
            copyBtn.addEventListener('click', () => copyCode(codeId));
        }
    } else {
        messageDiv.innerHTML = `
            <span>${escapeHtml(text)}</span>
            <time>${timestamp}</time>
        `;
    }
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function sendMessage(message) {
    // Check if the session is new (e.g., user refreshed/reopened the app)
    const isNewSession = sessionStorage.getItem("newSession") === "true";

    try {
        const response = await fetch('/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: message,
                userId: userId,
                username: username,
                newSession: isNewSession
            })
        });

        const data = await response.json();
        appendMessage(data.reply, false);

        // Reset session state after first message
        sessionStorage.setItem("newSession", "false");
    } catch (error) {
        appendMessage('Error: Could not get response', false);
        console.error('Error sending message:', error);
    }
}

function handleEnterKey(e) {
    if (e.key === 'Enter') sendMessageHandler();
}

function toggleDropdown() {
    dropdownMenu.classList.toggle('hidden');
}

function toggleProfileMenu() {
    profileMenu.classList.toggle('hidden');
}

function toggleQuestionMenu() {
    questionMenu.classList.toggle('hidden');
}

function toggleMicrophone() {
    micIcon.classList.toggle('active');
    micStatus.textContent = micIcon.classList.contains('active') ? 'mic: on' : 'mic: off';
    micStatus.classList.remove('hidden');
    setTimeout(() => micStatus.classList.add('hidden'), 3000);
}

function toggleSideMenu() {
    sideMenu.classList.toggle('active');
    if (sideMenu.classList.contains('active')) loadChatHistory();
}

function closeSideMenu() {
    sideMenu.classList.remove('active');
}

function handleOutsideClicks(e) {
    if (!menuIcon.contains(e.target) && !sideMenu.contains(e.target)) {
        closeSideMenu();
    }
    if (!dropdownButton.contains(e.target)) {
        dropdownMenu.classList.add('hidden');
    }
    if (!profileIcon.contains(e.target)) {
        profileMenu.classList.add('hidden');
    }
    if (!questionIcon.contains(e.target)) {
        questionMenu.classList.add('hidden');
    }
}

async function loadConversation(conversationId) {
    try {
        const response = await fetch(`/api/conversation?conversationId=${encodeURIComponent(conversationId)}`);
        const conversation = await response.json();
        chatContainer.innerHTML = ''; // Clear current chat
        
        // Loop through messages and append them
        conversation.messages.forEach(msg => {
            appendMessage(msg.content, msg.role === 'user');
        });
    } catch (error) {
        console.error('Error loading conversation:', error);
    }
}

// Event Handlers
function sendMessageHandler() {
    const message = askInput.value.trim();
    if (message) {
        appendMessage(message, true);
        askInput.value = '';
        sendMessage(message);
    }
} 