/* ============================================================
   KodaguEWS - Auth Page JavaScript
   Handles tab switching, form validation, password toggle, and Firebase Auth
   ============================================================ */

import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ---- Tab Switching ----
window.switchTab = function(tab) {
    const signinTab = document.getElementById('signinTab');
    const registerTab = document.getElementById('registerTab');
    const signinForm = document.getElementById('signinForm');
    const registerForm = document.getElementById('registerForm');

    if (tab === 'signin') {
        signinTab.classList.add('active');
        registerTab.classList.remove('active');
        signinForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        signinForm.style.animation = 'none';
        signinForm.offsetHeight; // reflow
        signinForm.style.animation = 'fadeInUp 0.4s ease';
    } else {
        registerTab.classList.add('active');
        signinTab.classList.remove('active');
        registerForm.classList.remove('hidden');
        signinForm.classList.add('hidden');
        registerForm.style.animation = 'none';
        registerForm.offsetHeight;
        registerForm.style.animation = 'fadeInUp 0.4s ease';
    }
}

// ---- Method Toggle (Email / Phone) ----
window.switchMethod = function(method) {
    const btns = document.querySelectorAll('.method-btn');
    btns.forEach(b => b.classList.remove('active'));
    event.target.closest('.method-btn').classList.add('active');
}

// ---- Password Visibility Toggle ----
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

// ---- Form Handlers ----
window.handleSignin = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('signinBtn');
    const email = document.getElementById('signinEmail').value;
    const password = document.getElementById('signinPassword').value;
    
    const originalBtnHTML = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div> Signing in...';
    btn.disabled = true;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem('userDisplayName', userCredential.user.displayName || email.split('@')[0]);
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert("Sign in failed: " + error.message);
        btn.innerHTML = originalBtnHTML;
        btn.disabled = false;
    }
}

// ---- Firebase Registration ----
window.handleRegister = async function(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    const btn = document.getElementById('registerBtn');
    const originalBtnHTML = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div> Creating Account...';
    btn.disabled = true;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        localStorage.setItem('userDisplayName', name);
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert("Registration failed: " + error.message);
        btn.innerHTML = originalBtnHTML;
        btn.disabled = false;
    }
}

// (For backward compatibility with the HTML, if it tries to call sendOTP)
window.sendOTP = function() {
    alert("OTP verification is bypassed in this version. Just enter your email and password to register.");
}

// ---- Official Sign In ----
window.handleOfficialSignin = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('officialSigninBtn');
    const email = document.getElementById('officialEmail').value;
    const password = document.getElementById('officialPassword').value;

    const originalBtnHTML = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div> Authenticating...';
    btn.disabled = true;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem('userDisplayName', userCredential.user.displayName || "Official Account");
        window.location.href = 'official-dashboard.html';
    } catch (error) {
        alert("Authentication failed: " + error.message);
        btn.innerHTML = originalBtnHTML;
        btn.disabled = false;
    }
}

window.handleOfficialRegister = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('officialRegisterBtn');
    const name = document.getElementById('offRegName').value;
    const email = document.getElementById('offRegEmail').value;
    const password = document.getElementById('offRegPassword').value;
    const code = document.getElementById('offRegCode').value;

    // Simulate official invite code check
    if (code !== "KODAGU2025" && code !== "GOVT-EWS") {
        alert("Invalid Official Invite Code.");
        return;
    }

    const originalBtnHTML = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div> Registering...';
    btn.disabled = true;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        localStorage.setItem('userDisplayName', name);
        window.location.href = 'official-dashboard.html';
    } catch (error) {
        alert("Registration failed: " + error.message);
        btn.innerHTML = originalBtnHTML;
        btn.disabled = false;
    }
}

// ---- Add input focus animations ----
document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.closest('.input-wrapper').classList.add('focused');
        });
        input.addEventListener('blur', () => {
            input.closest('.input-wrapper').classList.remove('focused');
        });
    });
});
