# Advanced Web-Based Projectile Simulator

An educational web application for exploring two-dimensional projectile motion through an interactive physics lab, a local two-player artillery game, and a teacher portal for setting assignments and tracking progress.

The browser runs the simulations and draws the results. A Node.js/Express server handles accounts, classes, assignments, attempt records, and game statistics, with data stored in a SQLite database through `sql.js`.

## Features

| Area | What you can do |
| --- | --- |
| **Lab Mode** | Change launch angle, speed, mass, gravity, and air resistance; inspect trajectories, velocity vectors, graphs, and calculation steps. |
| **Experiment tools** | Compare 2–4 simultaneous launches, place rectangular obstacles with adjustable bounce, and estimate the angle that maximizes range. |
| **Mini-Game** | Take turns on one shared screen, aim across randomly generated terrain, and compete to win three rounds. |
| **Teacher Portal** | Create classes and assignments, share join codes, set prerequisites, and inspect class and student performance. |
| **Student dashboard** | Join classes, open available assignments, and unlock later assignments by completing prerequisites. |

This is an educational/demo implementation.

## Getting started

### Requirements

- Node.js and npm. The repository does not currently declare a minimum Node.js version.
- Git, or a downloaded ZIP of this repository.
- A modern browser with JavaScript enabled. The interface is designed primarily for desktop use.
- Internet access for dependency installation and the browser libraries loaded from jsDelivr: Chart.js and KaTeX.

### Install and run

```bash
git clone https://github.com/Realkai1221/Advanced-Web-based-projectile-simulator.git
cd Advanced-Web-based-projectile-simulator
npm ci
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Keep the terminal running while using the application; press **Ctrl+C** to stop the server.

`npm ci` installs the versions recorded in `package-lock.json`. `npm install` is also available for ordinary dependency installation, but may update the lockfile.

There is no separate frontend build command. Express serves the files in `client/` and the API from the same server. Open the HTTP address above rather than opening the HTML files directly.

## Accounts and navigation

1. On the home page, select **Register**.
2. Enter a username, email address, and password, then choose **Student** or **Teacher**.
3. After registration, log in with your username and password.
4. Open **Lab Mode** or **Mini-Game**. Teacher accounts also have access to **Teacher Portal**.

Usernames must contain 3–20 letters, numbers, or underscores. Passwords must contain 6–64 characters. Registration creates an account but does not log you in automatically. Create your own account; no default login credentials are documented.

Login is required for the normal application workflow. The browser stores the session in `sessionStorage`, and server sessions expire after 24 hours. Use **Logout** to end a session.

## Using Lab Mode

### Your first experiment

1. Open **Lab Mode**.
2. Keep the defaults: **45°**, **30 m/s**, **1 kg**, **9.81 m/s²**, and **None** for drag.
3. Select **Fire** to launch the projectile.
4. Watch the trajectory, velocity arrow, live values, and graphs.
5. Change one setting and fire again to compare traces. Select **Reset** to clear the projectiles and graphs.

The launch point is `(10 m, 0 m)`, and the visible world is 200 m wide by 100 m high. With the defaults above, the numerical simulation lands at approximately `x = 101.6 m`, about 91.6 m from the launch point.

### Controls

| Setting | Available values | Default |
| --- | --- | --- |
| Launch angle | 0–90° | 45° |
| Initial speed | 1–100 m/s | 30 m/s |
| Mass | 0.1–10 kg | 1 kg |
| Gravity | 0.1–25 m/s² | 9.81 m/s² |
| Drag model | None, Linear, Quadratic | None |
| Drag coefficient | 0.01–5 when drag is enabled | 0.5 |
| Playback | Pause, 0.1×, 0.25×, 0.5×, 1× | 1× |

The coefficient represents `c` for linear drag and `Cd` for quadratic drag; these have different physical meanings.

### Inspect motion

The graphs show trajectory `y(x)`, horizontal and vertical velocity over time, horizontal and vertical acceleration over time, and speed over time.

Select **Pause**, or wait until the projectile lands, then click near the latest projectile's trail to inspect a calculation step. The step panel shows state values and the equations used by the numerical update. Select a point before the end of the trail; the final impact transition currently has an inspection issue.

**Reset** preserves the control settings, obstacles, and playback speed. If a new shot appears stationary after a reset, select **1×** to resume.

### Compare multiple launches

Enable the multi-launch option, add the desired number of projectiles (2–4), and set each projectile's angle and speed. Mass, gravity, and drag settings are shared. Select **Fire** to launch them together.

Add all required rows before adjusting their values: adding a row rebuilds the controls and resets those values. The current **Remove Last** button does not work; reloading the page restores the initial two-row configuration.

### Add obstacles

Set the obstacle width and height (2–30 m) and restitution (0–1), select **Place Obstacle**, then click the canvas to place it. Select **Done Placing** to leave placement mode, or **Clear All** to remove obstacles.

Restitution controls the bounce: `0` removes the velocity component into the surface, while `1` preserves its magnitude on reflection.

### Find an optimal angle

Select **Find Optimal Angle** to estimate the angle that gives the greatest unobstructed range for the current speed, mass, gravity, and drag. The result also updates the angle slider.

This calculation ignores obstacles and assignment targets. Its reported range is displacement from the launch point, while the Lab canvas uses absolute coordinates with its launch point at `x = 10 m`.

## Using the Mini-Game

The Mini-Game is a local, two-player game played by taking turns on the same computer.

1. Open **Mini-Game** and check the current player.
2. Set **Angle** (5–85°) and **Velocity** (5–50 m/s).
3. Select **Fire** and read the landing and miss-distance feedback.
4. Pass control to the other player when the turn changes.
5. Continue until one player wins three rounds. Select **New Game** on the result screen to restart.

Player 1 fires to the right and Player 2 fires to the left. The game uses Earth gravity (`9.81 m/s²`) with no drag. **Undo** and **Redo** navigate recorded aim adjustments during the current turn.

### Round rules

- A hit means landing within **8 m horizontally** of the opponent's base.
- Players alternate shots until a hit resolves the round.
- If the player who started the round hits first, the other player receives one contesting shot.
- If both hit, the smaller horizontal miss distance wins. A difference below `0.01 m` is a tie and awards no point.
- Each new round changes the terrain and base positions, alternates the starting player, and resets both aim settings.

The result screen includes a leaderboard. Currently, both local players are saved under the one logged-in account, with combined statistics. The field labelled **Wins** counts combined round points, not separate players' match victories. The displayed leaderboard can also lag behind the game just completed.

## Classes and assignments

### For teachers

1. Register or log in with a **Teacher** account and open **Teacher Portal**.
2. On **Classes**, enter a class name and optional semester, then select **Create Class**.
3. Share the generated join code with students, for example `AB1234`.
4. **Click the class card to select it.** Creating a class does not automatically select it.
5. Open **Assignments**, select **+ New Assignment**, configure the task, and select **Create**.
6. Click an existing assignment to edit it. The editor provides **Undo**, **Redo**, **Update**, **Delete**, and **Cancel**.

An assignment specifies its name, gravity, drag model and coefficient, target coordinates, success threshold, and optional prerequisite assignments. Class names and new assignment names must contain 3–50 letters, numbers, spaces, underscores, or hyphens.

A simple first assignment is:

| Field | Value |
| --- | --- |
| Name | First Landing |
| Gravity | 9.81 m/s² |
| Drag model | None |
| Target X / Y | 100 m / 0 m |
| Success threshold | 5 m |
| Prerequisites | None |

Students can solve this example using the Lab's default angle and speed.

Success is evaluated at the **final landing position**, not when a projectile passes through a target in flight. Ground-level targets (`Target Y = 0`) are the appropriate starting point. Targets within the Lab's 200 m visible width are easiest to use.

### Prerequisites

Select other assignments as prerequisites to create a learning sequence. A student must successfully complete every direct prerequisite before the next assignment unlocks. The portal displays the dependency graph, and the server rejects prerequisite cycles.

### For students

1. Register or log in with a **Student** account.
2. On the home dashboard, enter your teacher's code under **Join a Class**.
3. Select an enrolled class, then an unlocked assignment.
4. In the Lab, adjust angle and speed to land within the target's success threshold.
5. Read the Hit/Miss feedback and try again if necessary.

Assignment mode fixes gravity, drag, and mass, and uses single launches. Attempts record angle, speed, miss distance, elapsed wall-clock time, and success. After the first success, further shots become practice and are not recorded by the interface. Return to the dashboard and reopen the class to load newly available assignments.

### Analytics

Select a class in the Teacher Portal, then open **Analytics** to view student count, average miss distance, completion percentage, per-assignment results, and students who may need help. Click a student row to inspect their attempt history.

Completion percentage measures completed student–assignment pairs. A student is flagged **Needs Help** after more than five attempts in the class with no successes in that class. Class and assignment statistics generally include attempts up to and including the first success for each student/assignment; the main student table includes all saved attempts.

## Technology and project structure

| Layer | Implementation |
| --- | --- |
| Frontend | HTML, CSS, plain JavaScript, HTML Canvas |
| Charts and equations | Chart.js and KaTeX, loaded from jsDelivr |
| Server | Node.js and Express |
| Storage | SQLite through `sql.js`, persisted to a local file |
| Authentication | bcrypt password hashes and database-backed bearer sessions |

```text
client/
  index.html                 Registration, login, and dashboard
  lab.html                   Physics lab
  game.html                  Local two-player game
  portal.html                Teacher portal
  css/styles.css             Shared styling; pages also contain inline styles
  js/
    lab/                     Lab controls, rendering, graphs, and experiments
    game/                    Turns, scoring, terrain, rendering, and leaderboard
    portal/                  Classes, assignment editor, prerequisites, analytics
    shared/
      api.js                 Browser API client and session handling
      nav.js                 Shared navigation
      physics/               Entities, drag, integration, collisions, trajectories
      algorithms/            Collision helpers, range search, merge sort
      dataStructures/        BST, linked list, graph, queue, stack
server/
  index.js                   Express setup and startup
  database/                  Database wrapper and schema.sql
  middleware/auth.js         Session authentication
  routes/                    Auth, classes, assignments, attempts, analytics, game
  utils/                     Password/token helpers, graph, merge sort
data/
  projectile-sim.db          Persistent application database
package.json                 Dependencies and start script
package-lock.json            Locked dependency versions
```

Browser scripts use shared globals and are loaded in dependency order by the HTML pages. There is no frontend framework or bundler.

### Data storage

The server loads `data/projectile-sim.db` if it exists, applies the table-creation schema, and writes the database back to disk. If the file is absent, it creates a new database automatically; no separate database service or manual migration command is needed.

The repository includes a database file, so a checkout may already contain data. Accounts, sessions, classes, enrolments, assignments, attempts, and game statistics persist there. Back it up with the server stopped before replacing or resetting it. For a fresh local database, stop the server and move the existing file to a backup location before restarting.

The database wrapper keeps the database in memory and exports it after writes. Use one server process with a writable, persistent `data/` directory.

### API overview

| Prefix | Purpose |
| --- | --- |
| `/api/auth` | Registration, login, logout |
| `/api/classes` | Class creation, listing, and enrolment |
| `/api/assignments` | Assignment configuration and prerequisite information |
| `/api/attempts` | Record and retrieve assignment attempts |
| `/api/analytics` | Class and individual student performance |
| `/api/game` | Game sessions, results, and leaderboard |
| `/api/health` | Server/database health response |

Protected routes accept `Authorization: Bearer <token>`. The game router is also mounted directly under `/api`, which provides the `/api/leaderboard` route used by the frontend.

