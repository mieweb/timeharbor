# TimeHarbor

**Privacy-First Time Tracking and Institutional Knowledge Sharing**

<img src="/public/timeharbor-icon-generator.html" alt="TimeHarbor Logo" width="80" style="border-radius: 10px;"/>

Meteor MongoDB Blaze Tailwind Firebase Real-Time Notifications

TimeHarbor is a comprehensive time tracking and institutional knowledge management platform designed specifically for teams, organizations, and communities that prioritize privacy and user empowerment. Unlike traditional employee monitoring solutions, TimeHarbor operates on the principle that **individuals own their time data** and control exactly what gets shared with whom.

**Watch the quick start video:** [https://youtube.com/shorts/uuosLqHDHRQ?feature=share](https://youtube.com/shorts/uuosLqHDHRQ?feature=share)

---

## Table of Contents

- [🎯 Purpose & Vision](#-purpose--vision)
- [🚀 Key Features](#-key-features)
- [🏢 Institutional Use Cases](#-institutional-use-cases)
- [📊 Core Concepts](#-core-concepts)
- [🔒 Privacy & Security](#-privacy--security)
- [💻 Technology Stack](#-technology-stack)
- [📁 Project Structure](#-project-structure)
- [⚙️ Installation & Setup](#️-installation--setup)
- [🛠️ Development](#️-development)
- [📝 Configuration](#-configuration)
- [🚀 Running the Application](#-running-the-application)
- [🧪 Testing](#-testing)
- [🔄 Real-Time Features](#-real-time-features)
- [📱 Mobile & Platform Support](#-mobile--platform-support)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [👋 Contact](#-contact)

---

## Features

- ⏱️ **Clock In/Clock Out:** Simple, intuitive interface for tracking work sessions
- 🏷️ **Project Tagging:** Organize time entries by projects, objectives, or tasks (e.g., "robotics build," "grant writing," "classwork")
- 📝 **Personal Reflection:** Add context, challenges, and accomplishments to each session
- 🔒 **User-Controlled Sharing:** All data stays private by default—you decide who sees what and when
- 👥 **Team Collaboration:** Create teams, invite members, and selectively share progress and insights
- 📊 **Reporting & Summaries:** Generate custom reports to share contributions and progress
- 🎯 **Role Flexibility:** Supports employees, students, mentors, volunteers, and nonprofit contributors
- 📱 **Responsive Design:** Works seamlessly on desktop, tablet, and mobile devices

---

## Quick Start

1. **Create an account** at the login page
2. **Create or join a team** on the Teams page
3. **Start a session** to begin tracking time
4. **Create activities** to document what you worked on
5. **View progress** on the Home page to see team sessions and activities
6. **Share selectively** by generating reports or inviting team members

👉 **[Watch the video tutorial](https://youtube.com/shorts/uuosLqHDHRQ?feature=share)** for a visual walkthrough.

---

## Installation

### Prerequisites

- Node.js (v14+)
- Meteor (install via `npm install -g meteor`)
- MongoDB (Meteor includes a local instance for development)

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mieweb/timeharbor.git
   cd timeharbor
   ```

2. **Install dependencies:**
   ```bash
   meteor npm install
   ```

3. **Start the development server:**
   ```bash
   meteor
   ```

4. **Open in your browser:**
   ```
   http://localhost:3000
   ```

5. **Run tests (optional):**
   ```bash
   npm run test
   ```

---

## Basic Usage

### For Individual Users

1. **Sign up** and create your account
2. **Create a team** (you'll be the admin)
3. **Start a session** when you begin work
   - Clock in for the start time
   - Clock out when finished
4. **Add activities** to describe what you did during the session
   - Include relevant details and reflections
5. **View your history** on the Home page
6. **Invite team members** to collaborate and share progress

### For Team Leads & Mentors

1. **Create a team** and invite members
2. **View all team sessions** and member activities on the Home page
3. **Monitor progress** in real-time without surveillance
4. **Receive shared data** only when team members choose to share with you
5. **Provide feedback** based on reflections and accomplishments

### For Administrators

- **Manage team members:** Add, remove, and assign roles
- **View team analytics:** See aggregated time and activity data
- **Generate reports:** Create summaries for stakeholders or grant applications
- **Customize settings:** Configure notification preferences and data sharing policies

---

## Core Concepts

### Sessions
A **session** represents a continuous block of time spent on work or a project. You control when sessions start and stop.

### Activities
**Activities** are detailed entries within a session that describe what you accomplished, challenges faced, and reflections on your work.

### Teams
A **team** is a group of users collaborating together. You can:
- Create teams and be the admin
- Join multiple teams
- Manage team membership
- Control what you share with each team

### Privacy Controls
All your data is private by default. You decide:
- What to track
- Who can see your data
- When and what to share with others
- How detailed reports should be

---

## Use Cases

**FIRST Robotics Teams**
- Mentors and students log time on projects, then share summaries with sponsors or teachers

**Nonprofits & Community Organizations**
- Volunteers track hours for grant applications, board reports, and impact assessment

**Educational Settings**
- Students track time on assignments and extracurriculars, optionally sharing with teachers or parents

**Workplaces**
- Employees document project work, reflect on challenges, and share progress with managers

**Personal Development**
- Track time on learning, hobbies, or personal goals for self-reflection and improvement

---

## Design Principles

🔒 **Privacy First**
- No data is visible to others without your explicit consent

💪 **Empowerment**
- Helps you advocate for yourself and communicate your value

😊 **Non-Intrusive**
- A supportive buddy, not a surveillance tool

🌐 **Broad Applicability**
- Works for nonprofits, education, traditional workplaces, and personal use

📈 **Self-Reflection Focused**
- Encourages personal growth and positive communication about your contributions

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Meteor JS, MongoDB |
| **Frontend** | Blaze Templates (React migration planned) |
| **Styling** | Tailwind CSS, DaisyUI |
| **Data Grid** | AG Grid Community |
| **Deployment** | Web-based, mobile & desktop responsive |
| **Notifications** | Firebase Cloud Messaging, Web Push |

---

## Privacy & Data Ownership

✅ **What You Control**
- All your time and activity data is yours
- No data is shared without your permission
- You can delete your data anytime
- You decide what appears in reports

❌ **What We Don't Do**
- Monitor activity continuously
- Share data with third parties
- Sell or use your data for profit
- Enforce surveillance or control

✨ **How It Works**
- Data is stored securely on our servers
- You authenticate with your credentials
- You explicitly grant access to team members
- All sharing is opt-in and traceable

---

## Project Structure

```
timeharbor/
├── client/              # Frontend code
│   ├── components/      # Reusable UI components
│   ├── utils/           # Client utilities
│   └── routes.js        # Navigation
├── server/              # Backend code
│   ├── methods/         # Server-side logic
│   └── utils/           # Server utilities
├── tests/               # Test suite
├── public/              # Static assets
└── collections.js       # Data models
```

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Code style and standards
- Testing requirements
- Pull request process
- Feature suggestions

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Contact

For questions, suggestions, or support:
- **GitHub Issues:** [Create an issue](https://github.com/mieweb/timeharbor/issues) for bug reports or feature requests
- **Email:** Contact the TimeHarbor team at [support email]
- **Community:** Join discussions and connect with other users
