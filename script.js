const btn = document.querySelector("#lightBtn");
const body = document.body;

// Apply saved theme
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
    body.classList.add("darkMode");
}

if (btn) {
    btn.textContent = body.classList.contains("darkMode") ? "☀️" : "🌙";

    btn.addEventListener("click", () => {
        body.classList.toggle("darkMode");

        const isDark = body.classList.contains("darkMode");

        btn.textContent = isDark ? "☀️" : "🌙";

        localStorage.setItem("theme", isDark ? "dark" : "light");
    });
}

// Mobile nav
const hamburgerBtn = document.querySelector('#hamburgerBtn');
const navLinks = document.querySelector('#navLinks');

if (hamburgerBtn && navLinks) {
    hamburgerBtn.addEventListener("click", () => {
        const isOpen = navLinks.classList.toggle('active');
        hamburgerBtn.classList.toggle('ri-menu-line', !isOpen);
        hamburgerBtn.classList.toggle('ri-close-line', isOpen);
    });

    navLinks.addEventListener("click", (e) => {
        if (e.target.tagName === "H4" || e.target.tagName === "BUTTON" || e.target.tagName === "A") {
            navLinks.classList.remove('active');
            hamburgerBtn.classList.remove('ri-close-line');
            hamburgerBtn.classList.add('ri-menu-line');
        }
    });
}

// ---------- Firebase auth state ----------

(async () => {
    try {
        const { auth } = await import("./js/firebase-config.js");
        const { onAuthStateChanged, signOut } = await import(
            "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
        );

        const loggedOutLinks = document.querySelector("#loggedOutLinks");
        const loggedInLinks = document.querySelector("#loggedInLinks");
        const userEmailLabel = document.querySelector("#userEmailLabel");
        const logoutBtn = document.querySelector("#logout");

        onAuthStateChanged(auth, (user) => {
            if (user) {
                if (loggedOutLinks) loggedOutLinks.style.display = "none";
                if (loggedInLinks) loggedInLinks.style.display = "flex";
                if (userEmailLabel) userEmailLabel.textContent = user.email;
            } else {
                if (loggedOutLinks) loggedOutLinks.style.display = "inline";
                if (loggedInLinks) loggedInLinks.style.display = "none";
            }
        });

        logoutBtn?.addEventListener("click", () => {
            signOut(auth);
        });
    } catch (err) {
        console.warn("Firebase auth didn't load — check firebase-config.js and that this page is served over http(s), not opened as a local file.", err);
    }
})();
