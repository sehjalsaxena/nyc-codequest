// ============================================================
// SIFT Dashboard (v1)
// Handles: auth guard (redirect to login if signed out), loading
// the user's questionnaire responses + account info from
// Firestore, rendering them into the page, and logout.
//
// NOTE: dynamic import, same reasoning as script.js/questionnaire.js
// — a broken firebase-config.js shouldn't crash the whole page.
// ============================================================

const profileFields = document.querySelectorAll("[data-field]");
const preferenceBadges = document.getElementById("preferenceBadges");
const welcomeHeading = document.getElementById("welcomeHeading");

const accountName = document.getElementById("accountName");
const accountEmail = document.getElementById("accountEmail");
const accountJoined = document.getElementById("accountJoined");
const accountQuestionnaireStatus = document.getElementById("accountQuestionnaireStatus");
const accountProvider = document.getElementById("accountProvider");

const logoutBtn = document.getElementById("logout");
const quickLogoutBtn = document.getElementById("quickLogoutBtn");
const generateBtn = document.getElementById("generateBtn");

const recommendationsCard = document.getElementById("recommendationsCard");
const confidenceValue = document.getElementById("confidenceValue");
const resourceList = document.getElementById("resourceList");
const nextCardHeading = document.getElementById("nextCardHeading");
const nextCardText = document.getElementById("nextCardText");
const journeyStepRecommend = document.getElementById("journeyStepRecommend");
const journeyStepLearning = document.getElementById("journeyStepLearning");
const completionBarFill = document.getElementById("completionBarFill");
const completionPercentLabel = document.getElementById("completionPercentLabel");

(async () => {
    try {
        const { auth, db } = await import("./firebase-config.js");
        const { onAuthStateChanged, signOut } = await import(
            "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
        );
        const { doc, getDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
        );

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // No one is signed in — this page requires auth.
                window.location.href = "login.html";
                return;
            }

            await loadDashboard(user, db, doc, getDoc);
        });

        const doLogout = () => signOut(auth).then(() => {
            window.location.href = "index.html";
        });

        logoutBtn?.addEventListener("click", doLogout);
        quickLogoutBtn?.addEventListener("click", doLogout);

    } catch (err) {
        console.warn("Dashboard could not initialize Firebase — check firebase-config.js.", err);
    }
})();

/**
 * Loads the signed-in user's Firestore doc and renders their
 * questionnaire responses, badges, and account info into the page.
 */
async function loadDashboard(user, db, doc, getDoc) {
    accountEmail.textContent = user.email || "—";
    accountProvider.textContent = describeProvider(user);
    accountJoined.textContent = formatJoinedDate(user.metadata?.creationTime);

    let data = {};

    try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        data = snapshot.exists() ? snapshot.data() : {};
    } catch (err) {
        console.warn("Could not load user data from Firestore.", err);
    }

    const questionnaire = data.questionnaire || {};
    const displayName = user.displayName || (user.email ? user.email.split("@")[0] : "there");

    welcomeHeading.textContent = `👋 Welcome back, ${displayName}!`;
    accountName.textContent = user.displayName || "—";
    accountQuestionnaireStatus.textContent = data.questionnaireCompleted ? "Completed" : "Not completed";

    // Populate the six Learning Profile fields.
    profileFields.forEach((el) => {
        const key = el.dataset.field;
        el.textContent = questionnaire[key] || "—";
    });

    // Populate preference badges: skill, experience, learningStyle,
    // language, studyTime, goal, plus any multi-select preferences.
    const badgeValues = [
        questionnaire.skill,
        questionnaire.experience,
        questionnaire.learningStyle,
        questionnaire.language,
        questionnaire.studyTime,
        questionnaire.goal,
        ...(Array.isArray(questionnaire.preferences) ? questionnaire.preferences : []),
    ].filter(Boolean);

    preferenceBadges.innerHTML = "";

    if (badgeValues.length === 0) {
        preferenceBadges.innerHTML = `<span class="badge">No preferences recorded yet</span>`;
    } else {
        badgeValues.forEach((value) => {
            const span = document.createElement("span");
            span.className = "badge";
            span.textContent = value;
            preferenceBadges.appendChild(span);
        });
    }

    // Recommendations: questionnaire.js writes topResources + a
    // confidenceScore to Firestore once it scores resources.json.
    // If that data exists, reveal the recommendations card and flip
    // the journey/CTA into their "generated" state. If not, the
    // dashboard falls back to its original "Coming Soon" state.
    const hasRecommendations = Array.isArray(data.topResources) && data.topResources.length > 0;

    if (hasRecommendations) {
        renderRecommendations(data.topResources, data.confidenceScore);
        setJourneyStepDone(journeyStepRecommend, "Complete");
        // "Start Learning" only truly starts once the user has acted
        // on a recommendation, not merely because one exists — so it
        // stays pending here regardless.

        nextCardHeading.textContent = "Your Recommendations Are In!";
        nextCardText.textContent = "We've matched your learning profile against our resource library. Check out your top 3 picks above, or retake the questionnaire if your goals have changed.";

        if (generateBtn) {
            generateBtn.innerHTML = `<i class="ri-check-line"></i> Recommendations Ready`;
            generateBtn.disabled = true; // still non-interactive; it's a status, not an action
        }

        completionBarFill.style.width = "90%";
        completionPercentLabel.textContent = "90%";
    } else {
        // Original v1 behavior: nothing generated yet.
        if (generateBtn) {
            generateBtn.innerHTML = `<i class="ri-hourglass-line"></i> Coming Soon`;
            generateBtn.disabled = true;
        }
    }
}

/**
 * Renders the Recommended Resources card: confidence score plus
 * up to 3 resource cards (title, meta tags, link), with the first
 * one marked as the best match.
 */
function renderRecommendations(topResources, score) {
    recommendationsCard.style.display = "";
    confidenceValue.textContent = typeof score === "number" ? `${score}%` : "—";

    resourceList.innerHTML = "";

    topResources.forEach((resource, index) => {
        const card = document.createElement("div");
        card.className = "resource-card" + (index === 0 ? " best" : "");

        const meta = [resource.difficulty, resource.duration, resource.teachingStyle, resource.language]
            .filter(Boolean)
            .map((m) => `<span>${escapeHtml(m)}</span>`)
            .join("");

        card.innerHTML = `
            <div class="resource-card-head">
                <h3>${escapeHtml(resource.title || "Untitled Resource")}</h3>
                ${index === 0 ? '<span class="best-tag">Best Match</span>' : ""}
            </div>
            <div class="resource-meta">${meta}</div>
            ${resource.link ? `<a class="resource-link" href="${escapeHtml(resource.link)}" target="_blank" rel="noopener">Visit Resource <i class="ri-external-link-line"></i></a>` : ""}
        `;

        resourceList.appendChild(card);
    });
}

/**
 * Flips a journey timeline step from "pending" to "done" and
 * updates its status text.
 */
function setJourneyStepDone(stepEl, statusText) {
    if (!stepEl) return;
    stepEl.classList.remove("pending");
    stepEl.classList.add("done");
    stepEl.querySelector(".journey-dot i").className = "ri-check-line";
    stepEl.querySelector("[data-status]").textContent = statusText;
}

/**
 * Minimal HTML escaping for resource data pulled from Firestore/
 * resources.json before it's inserted via innerHTML.
 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function describeProvider(user) {
    const providerId = user.providerData?.[0]?.providerId || "";
    if (providerId.includes("google")) return "Google";
    if (providerId.includes("password")) return "Email";
    return providerId || "—";
}

function formatJoinedDate(isoString) {
    if (!isoString) return "—";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}
