# GolfCareersGame — Local playable prototype

This project contains 5 interactive mini-worlds that simulate golf industry careers:

1. Pro Golfer — swing timing, angle, power, ball physics and strokes.
2. Course Designer — tile-based editor (water, sand, greens, tee, hole) with playtest.
3. Coach — record swings, slow-motion replay, basic analysis.
4. Greenskeeper — timed maintenance tasks (mow, rake, repair).
5. Event Manager — schedule and simulate events with budget/staff.

How to run (recommended):

1. Install a static server if you don't have one:

   * With Node.js: run
     px http-server . -p 5173 inside the project folder.
   * Or use VS Code Live Server extension.

2. Open the URL shown (e.g. http://localhost:5173) in a modern desktop browser (Chrome/Edge/Firefox).

Notes:

* Everything is local and client-only (no backend).
* Art/3D models not included in the starter — add assets to assets/models/ if desired.
* The games are intentionally built to be practical and extendable; feel free to iterate.



# 

# To upload or update



Create repo on GitHub (web)



Create repo golf-worlds (public)



Local push (copy \& paste, replace username)

cd /path/to/my-site

git init

git add README.md

git commit -m "first commit"

git branch -M main

git remote add origin https://github.com/AndyP1288/Golf-Game.git

git push -u origin main



Enable Pages



GitHub repo → Settings → Pages → Source: main / root / → Save → Wait for https://YOUR\_GITHUB\_USERNAME.github.io/golf-worlds/

