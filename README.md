# TimeHarbor

A privacy-first time tracking and reflection tool that empowers individuals to track, reflect on, and selectively share how they spend their time. Designed as your personal assistant and coach, not a surveillance tool.

Quick start: [click here](./HOW_TO_USE.md)

---

## Table of Contents

- [Overview](#overview)
- [Screenshots](#screenshots)
- [Core Purpose](#core-purpose)
- [Key Features](#key-features)
- [Design Principles](#design-principles)
- [User Roles](#user-roles)
- [Use Cases](#use-cases)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Privacy & Sharing](#privacy--sharing)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## Overview

**TimeHarbor** empowers individuals to take control of their time tracking and reflection. Whether you're an employee, student, mentor, volunteer, or nonprofit contributor, TimeHarbor helps you understand how you spend your time, reflect on your work, and communicate your value—all while keeping your data private by default.

---

## Screenshots

Here are some screenshots showing TimeHarbor in action:

### Login & Authentication
![Login Screen](screenshots/1-login.png)
*Simple and secure login interface to get you started with TimeHarbor*

### Project Management
![Projects Screen](screenshots/2-projects.png)
*Create or join projects to organize your time tracking activities*

### Activity Tracking
![Activities Screen](screenshots/3-activities.png)
*Track time on specific activities within your projects with start/stop functionality*

### Time Overview Dashboard
![Dashboard Screen](screenshots/4-dashboard.png)
*Review your time usage across projects and activities with detailed breakdowns*

---

## Core Purpose

- **Empower individuals** (employees, students, mentors, volunteers) to track, reflect on, and communicate how they spend their time
- **Facilitate transparent, user-controlled sharing** of time and activity data with leadership, sponsors, teachers, or peers—only when the individual chooses
- **Act as a supportive coach and assistant**, focusing on personal growth and self-advocacy rather than surveillance

---

## Key Features

1. **Clock In/Clock Out:** Simple, intuitive interface for starting and ending work or project sessions
2. **Project & Objective Allocation:** Tag time entries to specific projects, objectives, or tasks (e.g., "robotics build," "grant writing," "classwork")
3. **Personal Reflection & Notes:** Add context, challenges, and accomplishments to each time entry, helping communicate value and obstacles
4. **User-Controlled Sharing:** All data remains private by default. Share with others (leaders, sponsors, teachers) only with explicit approval
5. **Role Flexibility:** Designed for employees, students, mentors, volunteers, and nonprofit contributors
6. **Reporting & Summaries:** Generate reports or summaries to share contributions, progress, or challenges as needed
7. **Coach/Assistant Persona:** Supportive tool that helps with personal growth and positive communication

---

## Design Principles

- **Privacy First:** No data is visible to others without user consent
- **Empowerment:** Helps users advocate for themselves, communicate their value, and reflect on their work
- **Non-Intrusive:** Avoids any "big brother" feel; the assistant is a buddy, not a monitor
- **Broad Applicability:** Useful for nonprofits, educational settings, and traditional workplaces

---

## User Roles

- **Individual User:** Primary role - tracks personal time, reflects on work, controls data sharing
- **Mentor/Leader:** Guides others while respecting their privacy; receives shared data only when offered
- **Student/Learner:** Tracks time on assignments, projects, and extracurriculars for personal growth and optional sharing
- **Volunteer/Contributor:** Logs hours and activities for personal records and grant/reporting purposes when needed

---

## Use Cases

- **FIRST Robotics Teams:** Mentors and students log time spent on projects, then selectively share summaries with sponsors or teachers
- **Nonprofits:** Volunteers track hours and activities, generating reports for grant applications or board meetings when needed
- **Students:** Track time spent on assignments or extracurriculars, sharing with teachers or parents as desired
- **Employees:** Document work on projects, reflect on challenges, and share progress with managers when ready
- **Personal Development:** Individuals track time on learning, hobbies, or goals for self-reflection and improvement

---

## Tech Stack

*The following stack supports the privacy-first, individual-focused approach:*

- **Backend:** Meteor JS, MongoDB
- **Frontend:** Blaze Templates (with plans for React migration)
- **Deployment:** Web-based (mobile and desktop responsive)
- **Privacy:** User-controlled data sharing with no default visibility to others

---

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mieweb/timeharbor.git
   cd timeharbor
   ```

2. **Install dependencies:**
   ```bash
   meteor npm install
   ```

3. **Run the application:**
   ```bash
   meteor
   ```

4. **Access the app:**
   Open your browser and navigate to `http://localhost:3000`

---

## Usage

- **Create Your Account:** Sign up as an individual user to start tracking your time privately
- **Start a Personal Session:** Begin tracking your work, study, or project time with simple clock in/out
- **Tag Your Activities:** Create projects or tasks to categorize your time (e.g., "Math Homework," "Robot Assembly," "Grant Writing")
- **Add Reflections:** Include notes about challenges, accomplishments, or context for each session
- **Control Your Privacy:** All data stays private unless you choose to share specific summaries or reports
- **Generate Reports:** Create summaries to share with mentors, teachers, or supervisors when beneficial

---

## Privacy & Sharing

- **Private by Default:** Your time data is only visible to you
- **User-Controlled Sharing:** You decide what to share, when, and with whom
- **Selective Reports:** Generate specific summaries rather than sharing raw data
- **No Surveillance:** The tool focuses on empowerment and self-reflection, not monitoring
- **Data Ownership:** You maintain full control over your information

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Contact

For questions, support, or feature requests, please create an issue in this repository or contact the TimeHarbor team.

---
