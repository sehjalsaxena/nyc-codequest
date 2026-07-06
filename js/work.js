// ---------- FAQ accordion (How It Works page only) ----------
// Kept in its own file rather than added to script.js since it's
// specific to this page's markup (#faqList / .faq-item).
document.addEventListener("DOMContentLoaded", () => {
    const faqItems = document.querySelectorAll("#faqList .faq-item");

    faqItems.forEach((item) => {
        const question = item.querySelector(".faq-question");
        const answer = item.querySelector(".faq-answer");

        question.addEventListener("click", () => {
            const isOpen = item.classList.contains("open");

            // Close any other open item so only one is expanded at a time.
            faqItems.forEach((other) => {
                if (other !== item) {
                    other.classList.remove("open");
                    other.querySelector(".faq-answer").style.maxHeight = null;
                }
            });

            if (isOpen) {
                item.classList.remove("open");
                answer.style.maxHeight = null;
            } else {
                item.classList.add("open");
                answer.style.maxHeight = answer.scrollHeight + "px";
            }
        });
    });
});
