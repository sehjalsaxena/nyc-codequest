import { GoogleGenAI } from "@google/genai";


const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// Grouping DOM elements makes the code much easier to read and manage
const ui = {
    input: document.getElementById("prompt"),
    button: document.getElementById("sendBtn"),
    output: document.getElementById("output")
};

async function handleSubmission() {
    const userText = ui.input.value.trim();
    
    if (!userText) {
        ui.output.innerText = "Please type something before sending.";
        return;
    }

    // Lock the UI to prevent the user from spam-clicking the button
    setLoadingState(true);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: userText,
        });
        
        ui.output.innerText = response.text;
        ui.input.value = ""; // Clear the input field after a successful response
        
    } catch (error) {
        console.error("GenAI API Error:", error);
        ui.output.innerText = "Sorry, I ran into an issue connecting to the AI. Please try again.";
    } finally {
        // The finally block guarantees the UI unlocks, even if the API crashes
        setLoadingState(false);
    }
}

// Helper function to manage what the user sees and can interact with
function setLoadingState(isLoading) {
    ui.button.disabled = isLoading;
    ui.button.innerText = isLoading ? "Thinking..." : "Send";
    if (isLoading) ui.output.innerText = "Thinking...";
}

// Event Listeners
ui.button.addEventListener("click", handleSubmission);

// Allow users to press "Enter" to submit, because clicking a button is tedious
ui.input.addEventListener("keypress", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault(); 
        handleSubmission();
    }
});