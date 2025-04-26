// chatbot.js - Handles the Gemini AI chatbot functionality

document.addEventListener('DOMContentLoaded', () => {
  // Ensure this runs after app.js has potentially fetched initial news
  const chatbotButton = document.getElementById('chatbot-button');
  const chatbotBox = document.getElementById('chatbot-box');
  const closeChatbotButton = document.getElementById('close-chatbot');
  const chatbotMessages = document.getElementById('chatbot-messages');
  const userInput = document.getElementById('user-input');
  const sendMessageButton = document.getElementById('send-message');
  const chatbotInput = document.querySelector('.chatbot-input'); // Get parent for styling disabled state

  // --- Configuration ---
  // WARNING: Replace with your actual Gemini API Key.
  // DO NOT HARDCODE IN PRODUCTION! Use a backend proxy for security.
  const API_KEY = 'AIzaSyCnBs-EBAZ7dd8W6KpcOArdw5VOoZYBAbQ'; // <--- PUT YOUR KEY HERE
  const MODEL_NAME = 'gemini-1.5-flash-latest';
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

  // Store conversation history for context
  let conversationHistory = [];
  let isBotTyping = false; // Prevent multiple simultaneous requests

  // --- Initial Setup ---
  chatbotBox.style.display = 'none'; // Ensure chatbot is hidden initially
   // Basic check if API key is missing
   if (!API_KEY || API_KEY === 'YOUR_GEMINI_API_KEY') {
      console.warn("Chatbot Warning: Gemini API key is missing or is the placeholder value.");
   }


  // --- Event Listeners ---
  // (Keep the existing event listeners for button clicks, close, send, keydown)
  chatbotButton.addEventListener('click', () => {
      const isOpening = chatbotBox.style.display === 'none' || chatbotBox.style.display === '';
      chatbotBox.style.display = isOpening ? 'flex' : 'none';
      if (isOpening) {
          userInput.focus();
          addWelcomeMessage(); // Add welcome message if needed
      }
  });

  closeChatbotButton.addEventListener('click', () => {
      chatbotBox.style.display = 'none';
  });

  sendMessageButton.addEventListener('click', handleSendMessage);

  userInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          handleSendMessage();
      }
  });


  // --- Core Functions ---

  // Adds the initial greeting message if the chat is empty
  function addWelcomeMessage() {
      // (Keep the existing addWelcomeMessage function - it's fine)
      const firstMessage = chatbotMessages.querySelector('.message p');
      if (!firstMessage || !firstMessage.textContent.includes("sports assistant")) {
          const welcomeMsg = "Hi there! I'm your sports assistant. I can discuss recent headlines from this page or answer general sports questions using Gemini AI. Ask me anything! (Note: I don't have live scores)";
          addMessageToChat(welcomeMsg, 'bot');
          conversationHistory = [{ role: "model", parts: [{ text: welcomeMsg }] }];
      } else {
           if (conversationHistory.length === 0) {
               conversationHistory = [{ role: "model", parts: [{ text: firstMessage.textContent }] }];
           }
      }
      scrollToBottom();
  }

  // Handles sending user message, checking local news, and calling AI
  async function handleSendMessage() {
      // (Keep the existing handleSendMessage structure - the main change is inside searchLocalNews)
      if (isBotTyping || (!API_KEY || API_KEY === 'YOUR_GEMINI_API_KEY') ) {
           if(!API_KEY || API_KEY === 'YOUR_GEMINI_API_KEY') {
               addMessageToChat("Chatbot is not configured. Missing API Key.", 'bot', true);
           }
           return;
      }

      const messageText = userInput.value.trim();
      if (!messageText) return;

      addMessageToChat(messageText, 'user');
      conversationHistory.push({ role: "user", parts: [{ text: messageText }] });

      userInput.value = '';
      setChatbotInputState(true);
      addTypingIndicator();

      try {
          // 1. Check Local News Headlines First (using the *refined* search)
          const localNewsResponse = searchLocalNews(messageText); // <<< Uses the updated function below
          let botResponseText;

          if (localNewsResponse) {
              botResponseText = localNewsResponse;
              removeTypingIndicator();
              addMessageToChat(botResponseText, 'bot');
          } else {
              // 2. No specific local news found, query Gemini AI
              botResponseText = await getGeminiResponse();
              removeTypingIndicator();
              addMessageToChat(botResponseText, 'bot');
          }

          conversationHistory.push({ role: "model", parts: [{ text: botResponseText }] });

          if (conversationHistory.length > 13) {
               conversationHistory = [conversationHistory[0], ...conversationHistory.slice(-12)];
          }

      } catch (error) {
          console.error("Error during message handling:", error);
          removeTypingIndicator();
          let errorMsg = "Sorry, I encountered an error processing your request. Please try again later.";
          if (error.message.includes("API Error") || error.message.includes("API key")) {
               errorMsg = "Sorry, I couldn't connect to the AI assistant. There might be an issue with the configuration.";
          } else if (error.message.includes("Network error")) {
              errorMsg = "Network error. Please check your connection and try again.";
          }
          addMessageToChat(errorMsg, 'bot', true);
          conversationHistory.push({ role: "model", parts: [{ text: "Error occurred during response generation." }] });
      } finally {
          setChatbotInputState(false);
          if (chatbotBox.style.display === 'flex') {
               userInput.focus();
          }
      }
  }

  // --- *** REFINED searchLocalNews Function *** ---
  function searchLocalNews(query) {
      const lowerQuery = query.toLowerCase();

      // 1. Check if News Data is Loaded
      if (!window.sportsPulseNewsData || window.sportsPulseNewsData.length === 0) {
          return "The latest news headlines haven't loaded yet. Please wait or refresh the main page.";
      }

      // 2. Identify Potential Subject Keywords (e.g., 'basketball', 'formula 1', 'real madrid')
      // More robust approach: check against known categories/sports first
      const knownSports = ['football', 'soccer', 'basketball', 'tennis', 'cricket', 'formula 1', 'f1'];
      let primarySubject = null;
      let subjectKeywords = [];

      for (const sport of knownSports) {
          if (lowerQuery.includes(sport)) {
              primarySubject = sport === 'f1' ? 'formula 1' : sport; // Normalize 'f1'
              subjectKeywords.push(primarySubject);
              // Add related terms if needed (e.g., if 'football', also check 'soccer')
              if (primarySubject === 'football') subjectKeywords.push('soccer');
              if (primarySubject === 'soccer') subjectKeywords.push('football');
              break; // Found the main sport category
          }
      }

      // If no known sport found, extract general keywords (less reliable for filtering)
      if (!primarySubject) {
           const genericKeywords = lowerQuery.split(' ').filter(word => word.length > 4 && !['news', 'latest', 'about', 'what', 'tell'].includes(word));
           if (genericKeywords.length > 0) {
               subjectKeywords = genericKeywords;
               // Can't be sure of the primary subject here, so won't filter as strictly later
           } else {
               // If query is very generic like "latest news", maybe show top articles?
               if (lowerQuery.includes("latest") || lowerQuery.includes("headline")) {
                  const latestArticles = window.sportsPulseNewsData.slice(0, 3);
                  if (latestArticles.length > 0) {
                      let summary = "Here are the latest headlines loaded on the page:\n\n";
                      latestArticles.forEach(article => {
                          summary += `- **${article.title || 'Untitled'}** (${article.source?.name || 'N/A'})\n`;
                      });
                      return summary;
                  }
               }
               return null; // Query too vague, let Gemini handle it
           }
      }


      // 3. Filter Articles Based on Keywords (Initial Broad Pass)
      const potentiallyRelevantArticles = window.sportsPulseNewsData.filter(article => {
          const title = (article.title || "").toLowerCase();
          const description = (article.description || "").toLowerCase();
          // Must contain at least one of the identified keywords
          return subjectKeywords.some(keyword => title.includes(keyword) || description.includes(keyword));
      });

      if (potentiallyRelevantArticles.length === 0) {
          return null; // No articles even broadly match, let Gemini handle it
      }

      // 4. Refine Selection: Prioritize articles matching the *primary* subject, especially in the title.
      let specificMatches = [];
      if (primarySubject) { // Only do strict filtering if we identified a specific sport
           specificMatches = potentiallyRelevantArticles.filter(article => {
               const title = (article.title || "").toLowerCase();
               // Strong match: primary subject is in the title
               if (title.includes(primarySubject)) {
                   return true;
               }
               // Weaker match: primary subject is in description but not title (include if needed)
               // const description = (article.description || "").toLowerCase();
               // if (description.includes(primarySubject)) return true;
               return false; // Only include strong title matches for now
           });
           // If no strong title matches, maybe fall back to description matches or all potential matches?
           // For now, let's stick to title matches for better accuracy.
           if (specificMatches.length === 0) {
               // Fallback: maybe check description if no title match found
               specificMatches = potentiallyRelevantArticles.filter(article => {
                   const description = (article.description || "").toLowerCase();
                   return description.includes(primarySubject);
               });
           }

      } else {
          // If no primary subject was identified, use the broad matches
          specificMatches = potentiallyRelevantArticles;
      }


      // 5. Build Summary from Specific Matches
      if (specificMatches.length > 0) {
          let summary = `Based on recent headlines about **${primarySubject || subjectKeywords.join('/')}**:\n\n`;
          specificMatches.slice(0, 3).forEach(article => { // Limit summary length
              summary += `- **${article.title || 'Untitled Article'}**\n  *Source: ${article.source?.name || 'N/A'}*\n  ${article.description ? article.description.substring(0, 100) + '...' : '(No description)'}\n\n`;
          });
          if (specificMatches.length > 3) {
              summary += `...and possibly more related articles on the page.\n`;
          }
           summary += `\nIf this isn't quite right, ask a more general question for the AI assistant.`;
          return summary;
      }

      // 6. If filtering resulted in no specific articles, let Gemini handle it
      return null;
  }


  // --- Utility Functions ---
  // (Keep existing: setChatbotInputState, addMessageToChat, addTypingIndicator, removeTypingIndicator, scrollToBottom, getGeminiResponse)
  // Make sure these are exactly as provided in the previous "full chatbot.js" response,
  // as they handle the Gemini API call, history, UI updates etc.

  function setChatbotInputState(disabled) {
      isBotTyping = disabled;
      userInput.disabled = disabled;
      sendMessageButton.disabled = disabled;
      chatbotInput.classList.toggle('disabled', disabled);
  }

  function addMessageToChat(text, sender, isError = false) {
      // (Use the detailed version from the previous full code response that handles markdown)
      const messageElement = document.createElement('div');
      messageElement.classList.add('message', `${sender}-message`);
      if (isError) { messageElement.classList.add('error-message'); }
      const p = document.createElement('p');
      let html = text
          .replace(/</g, "<").replace(/>/g, ">")
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
      const lines = html.split('\n');
      let inList = false;
      html = lines.map(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('- ')) {
              const listItem = `<li>${trimmedLine.substring(2).trim()}</li>`;
              if (!inList) { inList = true; return `<ul>${listItem}`; }
              return listItem;
          } else {
              if (inList) { inList = false; return `</ul>${line}`; }
              return line;
          }
      }).join('\n');
      if (inList) { html += '</ul>'; }
      html = html.replace(/\n/g, '<br>');
      html = html.replace(/<br><ul>/g, '<ul>').replace(/<\/ul><br>/g, '</ul>');
      html = html.replace(/<li><br>/g, '<li>').replace(/<br><\/li>/g, '</li>');
      p.innerHTML = html;
      messageElement.appendChild(p);
      chatbotMessages.appendChild(messageElement);
      scrollToBottom();
  }

  function addTypingIndicator() {
      const typingElement = document.createElement('div');
      typingElement.classList.add('message', 'bot-message', 'typing-indicator');
      typingElement.innerHTML = `<p><span>.</span><span>.</span><span>.</span></p>`;
      chatbotMessages.appendChild(typingElement);
      scrollToBottom();
  }

  function removeTypingIndicator() {
      const typingIndicator = chatbotMessages.querySelector('.typing-indicator');
      if (typingIndicator) { chatbotMessages.removeChild(typingIndicator); }
  }

  function scrollToBottom() {
      chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  async function getGeminiResponse() {
      // (Use the detailed version from the previous full code response)
      if (!API_KEY || API_KEY === 'YOUR_GEMINI_API_KEY') {
           return "Sorry, the AI assistant is not configured. Please add an API key.";
      }

      const systemInstruction = { // Keep the detailed system prompt from before
           role: "system",
           parts: [{ text: `You are SportsPulse AI, a helpful and friendly sports assistant embedded on a news website (SportsPulse).
CONTEXT: The user is viewing a sports news page which has recent headlines. If the user's previous messages mention specific headlines found locally, use that context. Otherwise, assume they might be asking general sports questions.
Your capabilities:
- Answer general questions about sports rules, history, teams, players, events etc., based on your knowledge up to your last training data.
- Discuss the topics from the news headlines provided in the chat history, if any.
Your limitations:
- You **DO NOT** have access to live, real-time game scores, minute-by-minute updates, or information that happened *after* your knowledge cut-off date.
- You cannot browse the website or access external URLs.
Instructions:
- If asked for a LIVE score or something happening RIGHT NOW, clearly state you don't have live data. Politely offer to provide the last known result based on your training or general information instead.
- If asked about news, refer to the chat history if relevant news was mentioned. If not, answer generally.
- Be conversational and helpful. Keep answers relatively concise and easy to read in a chat interface.
- Format lists using markdown dashes (-) for bullet points.` }]
      };

      let contentsToSend = conversationHistory; // Send history as is for gemini-flash

      const requestBody = {
          contents: contentsToSend,
           safetySettings: [
             { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
             { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
             { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
             { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
           ],
           generationConfig: {
             temperature: 0.7,
             maxOutputTokens: 350,
           }
      };

      try {
          const response = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
              let errorBodyText = await response.text();
              let errorDetail = `API Error: ${response.status} ${response.statusText}`;
              try {
                  const errorJson = JSON.parse(errorBodyText);
                   errorDetail = `API Error (${response.status}): ${errorJson.error?.message || errorBodyText}`;
              } catch(e) { errorDetail += ` - ${errorBodyText}`; }
               console.error("Gemini API Error Response Body:", errorBodyText);
              throw new Error(errorDetail);
          }

          const data = await response.json();

          if (data.candidates && data.candidates[0]) {
              const candidate = data.candidates[0];
              if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
                   console.warn(`Gemini Response Warning: Finish reason - ${candidate.finishReason}`);
                   switch(candidate.finishReason) {
                      case 'SAFETY': return "I cannot provide a response to that topic due to safety guidelines.";
                      case 'RECITATION': return "My response may contain information from a source I cannot cite properly, so I cannot display it.";
                      default: return `My response generation was stopped due to: ${candidate.finishReason}. Please try rephrasing.`;
                   }
              }
              if (candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text) {
                  return candidate.content.parts[0].text.trim();
              }
          } else if (data.promptFeedback && data.promptFeedback.blockReason) {
               console.warn(`Gemini Prompt Blocked: ${data.promptFeedback.blockReason}`);
               return `Your request could not be processed due to safety filter: (${data.promptFeedback.blockReason}).`;
          }

          console.error("Unexpected Gemini API response structure:", data);
          return "Sorry, I received an unexpected response format from the AI assistant.";

      } catch (error) {
           console.error("Error fetching/processing Gemini response:", error);
           if (error.message.startsWith('API Error')) throw error;
           else throw new Error("Network error or issue connecting to the AI assistant.");
      }
  }


}); // End DOMContentLoaded