/* ============================================================
   KodaguEWS - Auth Page JavaScript
   Handles tab switching, form validation, password toggle
   ============================================================ */

// ---- Tab Switching ----
function switchTab(tab) {
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
function switchMethod(method) {
    const btns = document.querySelectorAll('.method-btn');
    btns.forEach(b => b.classList.remove('active'));
    event.target.closest('.method-btn').classList.add('active');
}

// ---- Password Visibility Toggle ----
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

// ---- Form Handlers ----
function handleSignin(e) {
    e.preventDefault();
    const btn = document.getElementById('signinBtn');
    const email = document.getElementById('signinEmail').value;
    btn.innerHTML = '<div class="spinner"></div> Signing in...';
    btn.disabled = true;

    // Save name to localStorage (extract from email if not found)
    const name = email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    localStorage.setItem('userDisplayName', name || "Citizen User");

    // Simulate API call
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1500);
}

// ---- OTP Verification ----
let generatedOTP = null;

function sendOTP() {
    const emailInput = document.getElementById('regEmail');
    if (!emailInput.value) {
        alert("Please enter your email first.");
        return;
    }
    
    // Generate a 6-digit OTP
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Show the OTP group
    document.getElementById('otpGroup').style.display = 'block';
    
    // In DEV MODE, show the OTP on screen
    const devDisplay = document.getElementById('devOtpDisplay');
    document.getElementById('devOtpValue').textContent = generatedOTP;
    devDisplay.style.display = 'block';
    
    // Change button text
    const btn = document.querySelector('.verify-btn');
    if (btn) btn.textContent = "Resend Code";
    
    // Log to console as requested
    console.log("[DEV] Sent OTP to " + emailInput.value + ": " + generatedOTP);
}

function handleRegister(e) {
    e.preventDefault();
    
    // Verify OTP
    const enteredOtp = document.getElementById('regOtp').value;
    if (!generatedOTP) {
        alert("Please click 'Send Code' to verify your email first.");
        return;
    }
    if (enteredOtp !== generatedOTP) {
        alert("Invalid OTP! Please check the code and try again.");
        return;
    }

    const name = document.getElementById('regName').value;
    localStorage.setItem('userDisplayName', name);

    const btn = document.getElementById('registerBtn');
    btn.innerHTML = '<div class="spinner"></div> Creating Account...';
    btn.disabled = true;

    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1500);
}

// ---- Official Sign In ----
function handleOfficialSignin(e) {
    e.preventDefault();
    const btn = document.getElementById('officialSigninBtn');
    const email = document.getElementById('officialEmail').value;
    btn.innerHTML = '<div class="spinner"></div> Authenticating...';
    btn.disabled = true;

    // Save name to localStorage
    const name = email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    localStorage.setItem('userDisplayName', name || "Official Account");

    setTimeout(() => {
        window.location.href = 'official-dashboard.html';
    }, 1500);
}

function handleOfficialRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('officialRegisterBtn');
    const name = document.getElementById('offRegName').value;
    
    btn.innerHTML = '<div class="spinner"></div> Registering...';
    btn.disabled = true;

    localStorage.setItem('userDisplayName', name);

    setTimeout(() => {
        window.location.href = 'official-dashboard.html';
    }, 1500);
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
