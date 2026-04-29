-- database schema for projectile sim
-- I added tables as I built each feature, starting with users/auth
-- then classes, then assignments + the prereq stuff, then game tables last

PRAGMA foreign_keys = ON;

-- users and login
CREATE TABLE IF NOT EXISTS Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    expires_at DATETIME NOT NULL
);

-- classes and enrollment
CREATE TABLE IF NOT EXISTS Classes (
    class_id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL REFERENCES Users(user_id),
    class_name TEXT NOT NULL,
    join_code TEXT NOT NULL UNIQUE,
    semester TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES Users(user_id),
    class_id INTEGER NOT NULL REFERENCES Classes(class_id),
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, class_id)
);

-- assignments that teachers set for students
CREATE TABLE IF NOT EXISTS Assignments (
    assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL REFERENCES Classes(class_id),
    name TEXT NOT NULL,
    gravity REAL DEFAULT 9.81,
    drag_model TEXT DEFAULT 'none',
    drag_coefficient REAL,
    target_x REAL NOT NULL,
    target_y REAL,
    success_threshold REAL DEFAULT 5.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- which assignments need to be done before others
CREATE TABLE IF NOT EXISTS AssignmentPrereqs (
    prereq_id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES Assignments(assignment_id) ON DELETE CASCADE,
    required_assignment_id INTEGER NOT NULL REFERENCES Assignments(assignment_id) ON DELETE CASCADE
);

-- student attempts on assignments
CREATE TABLE IF NOT EXISTS Attempts (
    attempt_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES Users(user_id),
    assignment_id INTEGER NOT NULL REFERENCES Assignments(assignment_id),
    launch_angle REAL,
    initial_velocity REAL,
    miss_distance REAL,
    duration_ms INTEGER,
    is_success INTEGER DEFAULT 0,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- mini game tables (added these later when I built the game mode)
CREATE TABLE IF NOT EXISTS GameSessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_id INTEGER REFERENCES Users(user_id),
    player2_id INTEGER REFERENCES Users(user_id),
    winner_id INTEGER REFERENCES Users(user_id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME
);

CREATE TABLE IF NOT EXISTS LeaderboardEntries (
    entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES Users(user_id),
    session_id INTEGER REFERENCES GameSessions(session_id),
    wins INTEGER,
    total_shots INTEGER,
    total_miss_distance REAL,
    fastest_hit_ms INTEGER
);
