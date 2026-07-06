import { auth, db } from "./js/firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
    });
}
})



// ---------- Sign up ----------
const signupForm = document.querySelector("#signupForm");
const signupError = document.querySelector("#signupError");
const signupSubmitBtn = document.querySelector("#signupSubmitBtn");

signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    signupError.classList.remove("show");

    const email = document.querySelector("#signupEmail").value.trim();
    const password = document.querySelector("#signupPassword").value;

    signupSubmitBtn.disabled = true;
    signupSubmitBtn.textContent = "Creating account...";

    createUserWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            // Every new signup is, by definition, a first-time user —
            // seed their user doc with questionnaireCompleted: false so
            // login.js's check has something consistent to read, then
            // always send them to the questionnaire (never index.html).
            try {
                await setDoc(
                    doc(db, "users", userCredential.user.uid),
                    { questionnaireCompleted: false },
                    { merge: true }
                );
            } catch (err) {
                console.warn("Could not initialize user doc in Firestore.", err);
            }

            window.location.href = "pages/questionnaire.html";
        })
        .catch((err) => {
            signupError.textContent = friendlyError(err.code);
            signupError.classList.add("show");
            signupSubmitBtn.disabled = false;
            signupSubmitBtn.textContent = "Submit";
        });
});

function friendlyError(code) {
    switch (code) {
        case "auth/email-already-in-use":
            return "An account with this email already exists.";
        case "auth/invalid-email":
            return "Please enter a valid email address.";
        case "auth/weak-password":
            return "Password should be at least 6 characters.";
        default:
            return "Something went wrong. Please try again.";
    }
}
