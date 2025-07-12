# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arxiview is a React application for browsing arxivjsdata. The app provides a simple interface to search and view ArXiv papers with mock data.

## Development Commands

- `npm install` - Install dependencies
- `npm start` - Start development server (runs on http://localhost:3000)
- `npm run build` - Build for production

## Project Structure

```
src/
├── index.js      # React app entry point
├── App.js        # Main application component
├── App.css       # Application styles
└── index.css     # Global styles
public/
└── index.html    # HTML template
```

## Architecture

- **Build System**: Webpack with Babel for JSX/ES6+ transpilation
- **Styling**: CSS modules with modern CSS features
- **State Management**: React hooks (useState)
- **Mock Data**: Currently uses hardcoded ArXiv paper examples

## Key Features

- Search functionality for papers by title/abstract
- Paper cards displaying title, authors, abstract, and ArXiv links
- Responsive design with hover effects
- Clean, modern UI with gradient header

## Notes

- Author: Doosik Kim
- License: ISC
- Ready for integration with real arxivjsdata API

## Data Access Constraints

- arxivjsdata folder is intended to be written by other applications
- This application will only be allowed to read data from arxivjsdata
- arxivjsdata 폴더의 내용은 다른 프로젝트의 앱에 의해 변경될 수 있음.