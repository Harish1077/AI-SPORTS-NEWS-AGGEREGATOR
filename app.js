      
// app.js - Handles news fetching, filtering, and display using NewsAPI

// DOM Elements
const hamburger = document.querySelector(".hamburger");
const navLinks = document.querySelector(".nav-links");
const filterButtons = document.querySelectorAll(".filter-btn");
const newsContainer = document.getElementById("news-container");
const errorContainer = document.getElementById("error-container");
const retryBtn = document.getElementById("retry-btn");

// --- API Configuration ---
// WARNING: Hardcoding API keys in client-side code is insecure for production!
// Consider using a backend proxy to protect your key.
const NEWS_API_KEY = "7e6dc28b69944297b7f76eb3f4d38dad"; // Your provided API key
const NEWS_API_URL = "https://newsapi.org/v2/top-headlines"; // Using top-headlines for sports category

// State
let currentCategory = "all"; // Note: 'all' uses the base 'sports' category from API
window.sportsPulseNewsData = []; // Global variable to store fetched news

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    // Check if API key is set (basic check)
    if (!NEWS_API_KEY || NEWS_API_KEY === "YOUR_NEWSAPI_KEY_HERE") {
        showError("NewsAPI key is missing. Please configure the API key in app.js.");
        return; // Stop initialization if key is missing
    }

    // Initialize the app: Fetch initial 'sports' news
    fetchNews(currentCategory); // 'all' will fetch general sports news initially

    // Mobile menu toggle
    hamburger.addEventListener("click", toggleMobileMenu);

    // Filter buttons
    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const category = button.dataset.category;
            // Fetch news only if the category actually changes the query meaningfully
            // For this setup, 'all' shows general sports, others filter locally
            setActiveCategory(category);
            filterNews(category); // Trigger local filtering
        });
    });

    // Retry button
    retryBtn.addEventListener("click", () => {
        errorContainer.style.display = "none"; // Hide error
        newsContainer.style.display = "grid"; // Show news grid
        fetchNews(currentCategory); // Retry fetching news
    });
});

// --- Functions ---

function toggleMobileMenu() {
    navLinks.classList.toggle("active");
    hamburger.classList.toggle("active");
}

function setActiveCategory(category) {
    currentCategory = category; // Update the state
    filterButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.category === category);
    });
}

// Fetches news data from NewsAPI
async function fetchNews() {
    displaySkeletonLoaders();
    errorContainer.style.display = "none";
    newsContainer.style.display = "grid";

    // --- Prepare API Request ---
    const params = new URLSearchParams({
        // country: 'us',      // Get headlines for a specific country (e.g., 'us', 'gb')
        language: 'en',     // Get headlines in English
        category: 'sports', // Base category for top headlines
        apiKey: NEWS_API_KEY,
        pageSize: 30        // Fetch more articles initially for better local filtering
    });

    const url = `${NEWS_API_URL}?${params}`;
    console.log("Fetching News from:", url); // Log the URL for debugging

    try {
        const response = await fetch(url);

        // --- Handle Network/HTTP Errors ---
        if (!response.ok) {
            let errorData;
            try {
                 // Try to parse specific error message from NewsAPI
                 errorData = await response.json();
            } catch (e) {
                 // Fallback if response isn't JSON
                 errorData = { message: response.statusText };
            }
            console.error("NewsAPI HTTP Error Response:", errorData);
            // Provide more specific error messages based on status codes if needed
            let userMessage = `Error fetching news (${response.status}): ${errorData.message || 'Unknown error'}`;
            if (response.status === 401) userMessage = "Error: Invalid NewsAPI Key. Please check the key in app.js.";
            if (response.status === 429) userMessage = "Error: Too many requests. Please wait and try again later (NewsAPI rate limit exceeded).";
             if (response.status === 400) userMessage = `Error: Bad request (${errorData.code || ''}) - ${errorData.message || ''}`;
            throw new Error(userMessage);
        }

        // --- Handle API-Level Errors (e.g., status: "error") ---
        const data = await response.json();
        if (data.status === "error") {
             console.error("NewsAPI Functional Error:", data);
             throw new Error(`NewsAPI Error: ${data.message || 'An API error occurred.'} (${data.code || ''})`);
        }

        // --- Process Successful Response ---
        window.sportsPulseNewsData = data.articles || []; // Store fetched data globally
        console.log(`Fetched ${window.sportsPulseNewsData.length} articles.`);

        // Filter and display based on the currently selected category button
        filterNews(currentCategory, false); // Filter immediately without showing loaders again

    } catch (error) {
        console.error("Error in fetchNews:", error);
        // Display the error message thrown from try block or fetch failure
        showError(error.message || "Could not fetch news. Check console for details.");
    }
}

// Filters the globally stored news data based on the selected category button
// NOTE: This now primarily filters the data already fetched from the broad 'sports' category
function filterNews(category, showLoaders = true) {
    // We don't need loaders here usually, as filtering is local & fast
    // if (showLoaders) { displaySkeletonLoaders(); }

    errorContainer.style.display = "none"; // Ensure error is hidden
    newsContainer.style.display = "grid";  // Ensure grid is shown

    // Use a tiny timeout for potentially smoother UI update, though often unnecessary for local filter
    setTimeout(() => {
        let filteredNews = [];
        const currentNews = window.sportsPulseNewsData || []; // Use the fetched data

        if (category === "all") {
            filteredNews = currentNews; // Show all fetched sports news
        } else {
            // Filter locally based on keywords matching the category button
            filteredNews = currentNews.filter((news) => {
                const title = (news.title || "").toLowerCase();
                const description = (news.description || "").toLowerCase();
                const content = title + " " + description;
                const sourceName = (news.source?.name || "").toLowerCase();

                switch (category) {
                    case 'football':
                        return content.includes('football') || content.includes('soccer') || content.includes('premier league') || content.includes('la liga') || content.includes('champions league') || content.includes('mls');
                    case 'basketball':
                        return content.includes('basketball') || content.includes('nba') || sourceName.includes('nba') || content.includes('wnba') || content.includes('lakers') || content.includes('celtics') || content.includes('lebron');
                    case 'tennis':
                        return content.includes('tennis') || content.includes('grand slam') || sourceName.includes('atp') || sourceName.includes('wta') || content.includes('djokovic') || content.includes('nadal') || content.includes('swiatek');
                    case 'cricket':
                        return content.includes('cricket') || sourceName.includes('cricinfo') || content.includes('test match') || content.includes('t20') || content.includes('ipl') || content.includes('odi');
                    case 'formula1':
                        return content.includes('formula 1') || content.includes('f1') || sourceName.includes('formula1') || content.includes('grand prix') || content.includes('verstappen') || content.includes('hamilton') || content.includes('ferrari') || content.includes('mercedes');
                    default:
                        // Should not happen if buttons are set up correctly
                        return true; // Or false if unexpected category should show nothing
                }
            });
        }
        displayNews(filteredNews); // Display the locally filtered news
    }, 50); // Minimal delay
}


// Displays the news articles or a "no news" message
function displayNews(news) {
    newsContainer.innerHTML = ""; // Clear previous content

    if (!news || news.length === 0) {
        let message = `No news articles found matching the filter '${currentCategory}'.`;
        if (currentCategory === 'all') {
             message = "No sports headlines available at the moment. Try again later.";
        }
         // Add specific message if the initial fetch failed or returned zero articles
         if (window.sportsPulseNewsData.length === 0 && currentCategory === 'all') {
            message = "Failed to load any sports headlines. Please check your connection or API key configuration.";
         }

        newsContainer.innerHTML = `
            <div class="no-news" style="text-align: center; padding: 30px 20px; grid-column: 1 / -1; color: #555;">
                <i class="far fa-newspaper fa-3x" style="color: #ccc; margin-bottom: 15px;"></i>
                <p style="font-weight: 500;">${message}</p>
                ${currentCategory !== 'all' ? '<p style="font-size: 0.9em; color: #777;">Try selecting \'All Sports\' to see all fetched headlines.</p>' : ''}
            </div>
        `;
        return;
    }

    news.forEach((article) => {
        if (!article || !article.title) return; // Skip articles with no title

        const newsCard = document.createElement("div");
        newsCard.className = "news-card";

        // Format date robustly
        let formattedDate = "Date unavailable";
        try {
            if (article.publishedAt) {
                const publishedDate = new Date(article.publishedAt);
                if (!isNaN(publishedDate.getTime())) {
                    formattedDate = publishedDate.toLocaleDateString("en-US", {
                        year: 'numeric', month: 'short', day: 'numeric'
                    });
                }
            }
        } catch (e) { /* Ignore date formatting errors */ }

        // Determine category tag (best effort based on content/source)
        let categoryTag = "Sports"; // Default tag
        const title = (article.title || "").toLowerCase();
        const description = (article.description || "").toLowerCase();
        const content = title + " " + description;
        const sourceName = (article.source?.name || "").toLowerCase();

        // Prioritize matching based on the current filter if not 'all'
        if (currentCategory !== 'all') {
            categoryTag = currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1); // e.g., Football, Tennis
             if (categoryTag === 'Formula1') categoryTag = 'Formula 1'; // Formatting
        } else {
             // If 'all' is selected, try to guess tag from content
            if (content.includes("football") || content.includes("soccer") || sourceName.includes('espn fc')) categoryTag = "Football";
            else if (content.includes("basketball") || content.includes("nba") || sourceName.includes('nba')) categoryTag = "Basketball";
            else if (content.includes("tennis") || content.includes("grand slam") || sourceName.includes('atp')) categoryTag = "Tennis";
            else if (content.includes("cricket") || sourceName.includes('cricinfo') || content.includes('test match')) categoryTag = "Cricket";
            else if (content.includes("formula 1") || content.includes("f1") || sourceName.includes('formula1')) categoryTag = "Formula 1";
            // Add more specific tags if needed (e.g., Golf, Boxing)
        }


        newsCard.innerHTML = `
          <div class="news-img">
            <img src="${article.urlToImage || "https://placehold.co/600x400/eee/ccc?text=No+Image"}" alt="${article.title || 'News image'}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/600x400/eee/ccc?text=Image+Error';">
          </div>
          <div class="news-content">
            <span class="news-category">${categoryTag}</span>
            <h3 class="news-title">${article.title}</h3>
            <p class="news-description">${article.description || "No description available. Click card to read more."}</p>
            <div class="news-meta">
              <span class="news-source">${article.source?.name || "Unknown Source"}</span>
              <span class="news-date">${formattedDate}</span>
            </div>
          </div>
        `;

        // Add click event to open the full article
        if (article.url) {
            newsCard.style.cursor = "pointer";
            newsCard.addEventListener("click", () => {
                window.open(article.url, "_blank", "noopener noreferrer");
            });
        } else {
             newsCard.style.cursor = "default";
        }

        newsContainer.appendChild(newsCard);
    });
}

// Displays skeleton loaders while fetching data
function displaySkeletonLoaders() {
    newsContainer.innerHTML = ""; // Clear existing content
    errorContainer.style.display = "none"; // Hide error

    for (let i = 0; i < 9; i++) { // Display more skeletons (e.g., 9 for 3x3 grid)
        const skeletonCard = document.createElement("div");
        skeletonCard.className = "news-card skeleton";
        skeletonCard.innerHTML = `
          <div class="news-img skeleton-img"></div>
          <div class="news-content">
            <div class="skeleton-tag"></div>
            <div class="skeleton-title"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
            <div class="skeleton-meta"></div>
          </div>
        `;
        newsContainer.appendChild(skeletonCard);
    }
}

// Shows the error message container
function showError(message = "An unexpected error occurred. Please try again later.") {
    newsContainer.style.display = "none"; // Hide the news grid
    const errorText = errorContainer.querySelector("p");
    if (errorText) {
        errorText.textContent = message; // Update error message
    }
    // Ensure button text is correct
    const retryButtonText = errorContainer.querySelector("button");
    if (retryButtonText) retryButtonText.textContent = "Try Again";

    errorContainer.style.display = "flex"; // Show error container
}

// No longer need getMockNewsData()
// function getMockNewsData() { ... }

    