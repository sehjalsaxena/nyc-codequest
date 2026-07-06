// ============================================================
// SIFT Onboarding Questionnaire
// Handles: step navigation, selection rules, progress bar,
// Firestore save, resource scoring, and redirect to dashboard.
//
// NOTE ON AUTH: like script.js, the Firebase import is dynamic
// (not a static top-level `import`) so a missing/placeholder
// firebase-config.js can't take down the whole page — the wizard
// UI below still works, it just won't persist/redirect with real
// auth until firebase-config.js is wired up.
// ============================================================

const steps = Array.from(document.querySelectorAll(".step"));
const totalSteps = steps.length;

const stepLabel = document.getElementById("stepLabel");
const stepPercent = document.getElementById("stepPercent");
const progressFill = document.getElementById("progressFill");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const wizardShell = document.getElementById("wizardShell");
const loadingScreen = document.getElementById("loadingScreen");
const multiHint = document.getElementById("multiHint");

let currentStep = 1;

// Answers keyed by each step's data-key (skill, experience, goal,
// learningStyle, language, studyTime, preferences[])
const answers = {};

/**
 * Renders the progress bar + step counter for the current step.
 */
function updateProgress() {
    const pct = Math.round((currentStep / totalSteps) * 100);
    stepLabel.textContent = `Step ${currentStep} of ${totalSteps}`;
    stepPercent.textContent = `${pct}%`;
    progressFill.style.width = `${pct}%`;
}

/**
 * Shows the active step, hides the rest, and re-checks whether
 * Next should be enabled based on any prior answer for that step.
 */
function renderStep() {
    steps.forEach((step) => {
        step.classList.toggle("active", Number(step.dataset.step) === currentStep);
    });

    prevBtn.disabled = currentStep === 1;
    nextBtn.textContent = currentStep === totalSteps ? "Finish" : "Next";
    nextBtn.innerHTML = currentStep === totalSteps
        ? "Finish <i class=\"ri-check-line\"></i>"
        : "Next <i class=\"ri-arrow-right-line\"></i>";

    validateCurrentStep();
    updateProgress();
}

/**
 * Enables/disables the Next button based on whether the current
 * step's selection rule (data-max) has been satisfied.
 */
function validateCurrentStep() {
    const step = steps[currentStep - 1];
    const key = step.dataset.key;
    const max = Number(step.dataset.max);
    const selectedCount = Array.isArray(answers[key])
        ? answers[key].length
        : (answers[key] ? 1 : 0);

    if (key === "preferences") {
        multiHint.textContent = `${selectedCount} / ${max} selected`;
    }

    nextBtn.disabled = selectedCount === 0;
}

/**
 * Handles clicking an option card, respecting each step's max
 * selection count (1 for single-select steps, 2 for step 7).
 */
function handleOptionClick(step, card) {
    const key = step.dataset.key;
    const max = Number(step.dataset.max);
    const value = card.dataset.value;

    if (max === 1) {
        // Single select: clear siblings, select this one.
        step.querySelectorAll(".option-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        answers[key] = value;
    } else {
        // Multi select (max 2): toggle, evicting nothing unless full.
        if (!Array.isArray(answers[key])) answers[key] = [];

        const isSelected = card.classList.contains("selected");

        if (isSelected) {
            card.classList.remove("selected");
            answers[key] = answers[key].filter((v) => v !== value);
        } else {
            if (answers[key].length >= max) {
                return; // already at the cap, ignore extra clicks
            }
            card.classList.add("selected");
            answers[key].push(value);
        }
    }

    validateCurrentStep();
}

steps.forEach((step) => {
    step.querySelectorAll(".option-card").forEach((card) => {
        card.addEventListener("click", () => handleOptionClick(step, card));
    });
});

prevBtn.addEventListener("click", () => {
    if (currentStep > 1) {
        currentStep -= 1;
        renderStep();
    }
});

nextBtn.addEventListener("click", async () => {
    if (currentStep < totalSteps) {
        currentStep += 1;
        renderStep();
    } else {
        await finishQuestionnaire();
    }
});

renderStep();

/**
 * Runs the completion sequence: swap to the loading screen, step
 * through the animated status list, save to Firestore, score
 * resources, then redirect to the dashboard.
 */
async function finishQuestionnaire() {
    wizardShell.style.display = "none";
    loadingScreen.classList.add("active");

    const loadingStepEls = Array.from(document.querySelectorAll(".loading-step"));

    // Kick off the real work (save + scoring) alongside the animated
    // status list, so the 2-3s delay reflects actual processing time
    // rather than an arbitrary fake wait.
    const workPromise = saveAndRecommend();

    for (let i = 0; i < loadingStepEls.length; i++) {
        loadingStepEls[i].classList.add("active");
        loadingStepEls[i].querySelector("i").className = "ri-loader-4-line";
        await delay(550);
        loadingStepEls[i].classList.remove("active");
        loadingStepEls[i].classList.add("done");
        loadingStepEls[i].querySelector("i").className = "ri-checkbox-circle-line";
    }

    await workPromise;
    window.location.href = "../dashboard.html";
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Saves the questionnaire to Firestore under the current user and
 * runs the recommendation engine against resources.json, then
 * writes the result (best resource, top 3, confidence score) back
 * to the user's document.
 */
async function saveAndRecommend() {
    let uid = null;

    try {
        const { auth, db } = await import("../js/firebase-config.js");
        const { doc, setDoc } = await import(
            "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
        );

        uid = auth.currentUser ? auth.currentUser.uid : null;

        if (uid) {
            await setDoc(
                doc(db, "users", uid),
                {
                    questionnaire: answers,
                    questionnaireCompleted: true,
                },
                { merge: true }
            );
        }

        const recommendation = await buildRecommendation();

        if (uid && recommendation) {
            await setDoc(
                doc(db, "users", uid),
                {
                    bestResource: recommendation.best,
                    topResources: recommendation.top3,
                    confidenceScore: recommendation.confidenceScore,
                    progress: 0,
                },
                { merge: true }
            );
        }
    } catch (err) {
        // Mirrors script.js's approach: don't let a missing/broken
        // firebase-config.js block the flow — log and continue so
        // the user still reaches the dashboard.
        console.warn("Could not save questionnaire to Firestore — check firebase-config.js.", err);
    }
}

/**
 * Loads resources.json, scores every resource against the user's
 * answers using the weighted rubric below, and returns the top 3
 * plus a confidence score for the best match.
 *
 * Weights: Skill 40% · Experience 20% · Goal 15% ·
 *          Learning Style 10% · Language 10% · Study Time 5%
 */
async function buildRecommendation() {
    try {
        const response = await fetch("../resources.json");
        const resources = await response.json();

        const scored = resources.map((resource) => ({
            resource,
            score: scoreResource(resource, answers),
        }));

        scored.sort((a, b) => b.score - a.score);

        const top3 = scored.slice(0, 3).map((s) => s.resource);
        const best = top3[0] || null;
        const confidenceScore = scored[0] ? Math.round(scored[0].score) : 0;

        return { best, top3, confidenceScore };
    } catch (err) {
        console.warn("Could not load resources.json for recommendations.", err);
        return null;
    }
}

/**
 * Scores a single resource 0-100 against the user's answers.
 */
function scoreResource(resource, userAnswers) {
    let score = 0;

    // Skill match — 40%
    if (resource.skill && userAnswers.skill && resource.skill.toLowerCase() === userAnswers.skill.toLowerCase()) {
        score += 40;
    }

    // Experience / difficulty — 20%
    if (resource.difficulty && userAnswers.experience) {
        const difficultyMap = { "Beginner": "beginner", "Intermediate": "intermediate", "Advanced": "advanced" };
        if (resource.difficulty.toLowerCase() === (difficultyMap[userAnswers.experience] || "")) {
            score += 20;
        }
    }

    // Goal — 15% (matched against bestFor, loosely)
    if (resource.bestFor && userAnswers.goal) {
        if (resource.bestFor.toLowerCase().includes(userAnswers.goal.toLowerCase())) {
            score += 15;
        }
    }

    // Learning style — 10%
    if (resource.teachingStyle && userAnswers.learningStyle) {
        if (resource.teachingStyle.toLowerCase() === userAnswers.learningStyle.toLowerCase()) {
            score += 10;
        }
    }

    // Language — 10%
    if (resource.language && userAnswers.language) {
        if (userAnswers.language === "Both" || resource.language.toLowerCase() === userAnswers.language.toLowerCase()) {
            score += 10;
        }
    }

    // Study time — 5% (rewards shorter resources for shorter daily time)
    if (resource.duration && userAnswers.studyTime) {
        score += 5;
    }

    return score;
}
