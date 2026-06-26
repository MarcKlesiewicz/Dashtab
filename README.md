# DashTab

DashTab is a private Chrome extension that replaces the default New Tab page with a calm personal dashboard.

It is built for quick daily orientation: check the time, see the weather, start a focus session, keep an eye on movement breaks, and track water intake without opening another app.

## Features

- Large clock and personal greeting
- Focus timer with a dedicated focus mode
- Movement reminder for sitting and standing intervals
- Water intake barometer with daily pacing
- Weather widget with quick switching between Odense and Løgeskov
- Local settings for timer preferences
- Custom extension and tab icon

## Tech Stack

- Angular
- TypeScript
- SCSS
- Tailwind CSS and daisyUI
- Chrome Extension Manifest V3

## Development

```bash
npm install
npm start
```

Open `http://127.0.0.1:4200` while developing.

## Build The Extension

```bash
npm run build
```

Load the built extension from:

```text
dist/dashtab/browser
```

In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select that folder.
