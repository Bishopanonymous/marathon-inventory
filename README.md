# Marathon Inventory UI Prototype

A game inventory UI prototype inspired by Marathon (Bungie).
Pure HTML/CSS/JS — no build step required.

## Structure
```
marathon-inventory/
├── index.html        # Main prototype (self-contained)
├── README.md
└── assets/
    ├── fonts/        # Local font overrides (optional)
    └── icons/        # SVG icons (optional)
```

## Running locally
Open index.html directly in a browser, or use a local server:
```bash
# Python
python3 -m http.server 8080

# Node (npx)
npx serve .

# VS Code
# Install "Live Server" extension, right-click index.html → Open with Live Server
```

## Claude Code
This project is set up for use with Claude Code.
Run `claude` in this directory to start a session.
