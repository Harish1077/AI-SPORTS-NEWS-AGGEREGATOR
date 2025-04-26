# SportsPulse - AI-Powered Sports News Aggregator

A modern web application that aggregates sports news and provides an AI-powered chatbot for interactive sports updates and information.

## Features

- Real-time sports news aggregation
- AI-powered chatbot using Gemini AI
- Category-based news filtering
- Responsive design
- Interactive user interface

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- APIs: NewsAPI, Google Gemini AI
- Dependencies: Axios, CORS, dotenv

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sports-news-aggregator.git
cd sports-news-aggregator
```

2. Install dependencies:
```bash
cd backend
npm install
```

3. Create a `.env` file in the backend directory with your API keys:
```
PORT=3000
NEWS_API_KEY=your_news_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

4. Start the backend server:
```bash
node server.js
```

5. Open `index.html` in your browser or serve it using a local server.

## API Keys Required

- NewsAPI: Get your API key from [NewsAPI](https://newsapi.org/)
- Gemini AI: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Project Structure

```
sports-news-aggregator/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env
├── index.html
├── styles.css
├── app.js
├── chatbot.js
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- NewsAPI for providing sports news data
- Google Gemini AI for powering the chatbot
- All contributors and users of the project 