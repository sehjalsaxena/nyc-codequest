import { auth, db } from "./js/firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ---------- Dark mode toggle ----------
const btn = document.querySelector('#lightBtn');
const body = document.querySelector("body");

btn.addEventListener("click", () => {
    if (btn) {
    btn.textContent = body.classList.contains("darkMode") ? "☀️" : "🌙";

    btn.addEventListener("click", () => {
        body.classList.toggle("darkMode");

        const isDark = body.classList.contains("darkMode");

        btn.textContent = isDark ? "☀️" : "🌙";

        localStorage.setItem("theme", isDark ? "dark" : "light");
    })
}
})

// ---------- Login ----------
const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const loginSubmitBtn = document.querySelector("#loginSubmitBtn");

loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    loginError.classList.remove("show");

    const email = document.querySelector("#loginEmail").value.trim();
    const password = document.querySelector("#loginPassword").value;

    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = "Logging in...";

    signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            // Returning users skip the questionnaire entirely — check
            // Firestore before deciding where to send them.
            let completed = true;

            try {
                const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
                completed = userDoc.exists() && userDoc.data().questionnaireCompleted === true;
            } catch (err) {
                console.warn("Could not read user doc from Firestore — defaulting to questionnaire.", err);
            }

            window.location.href = completed ? "dashboard.html" : "pages/questionnaire.html";
        })
        .catch((err) => {
            loginError.textContent = friendlyError(err.code);
            loginError.classList.add("show");
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.textContent = "Submit";
        });
});

function friendlyError(code) {
    switch (code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return "Incorrect email or password.";
        case "auth/invalid-email":
            return "Please enter a valid email address.";
        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";
        default:
            return "Something went wrong. Please try again.";
    }
}
