'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function UserGuidePage() {
  const [activeTab, setActiveTab] = useState<'team' | 'admin'>('team')

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-base-content mb-4">📖 TimeHarbor User Guide</h1>
        <p className="text-lg text-base-content opacity-70">Everything you need to know to get started with time tracking</p>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs tabs-boxed justify-center mb-8">
        <a 
          className={`tab ${activeTab === 'team' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          👥 Team Members
        </a>
        <a 
          className={`tab ${activeTab === 'admin' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('admin')}
        >
          👑 Admins & Team Leaders
        </a>
      </div>

      {/* Team Members Section */}
      {activeTab === 'team' && (
        <div className="guide-section">
          <div className="card bg-base-100 shadow-lg mb-8">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-6">👥 For Team Members</h2>
              
              {/* Getting Started */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-primary">🚀 Getting Started</h3>
                <div className="steps steps-vertical lg:steps-horizontal">
                  <div className="step step-primary">
                    <div className="text-left">
                      <h4 className="font-semibold">1. Join a Team</h4>
                      <p className="text-sm opacity-70">Get a project code from your team leader and click "Join a Team" on the home page</p>
                    </div>
                  </div>
                  <div className="step step-primary">
                    <div className="text-left">
                      <h4 className="font-semibold">2. View Your Dashboard</h4>
                      <p className="text-sm opacity-70">Check your personal dashboard for today's hours and active projects</p>
                    </div>
                  </div>
                  <div className="step step-primary">
                    <div className="text-left">
                      <h4 className="font-semibold">3. Start Tracking Time</h4>
                      <p className="text-sm opacity-70">Go to Projects tab and clock into your assigned tickets</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Workflow */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-primary">⏰ Daily Workflow</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card bg-base-200 p-4">
                    <h4 className="font-semibold mb-2">🌅 Morning Routine</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Check your dashboard for today's tasks</li>
                      <li>• Review active projects and tickets</li>
                      <li>• Start your first work session</li>
                    </ul>
                  </div>
                  <div className="card bg-base-200 p-4">
                    <h4 className="font-semibold mb-2">🌆 Evening Routine</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Stop all active sessions</li>
                      <li>• Verify your timesheet accuracy</li>
                      <li>• Check tomorrow's schedule</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Key Features */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-primary">🔑 Key Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card bg-base-200 p-4 text-center">
                    <div className="text-3xl mb-2">📊</div>
                    <h4 className="font-semibold">Personal Dashboard</h4>
                    <p className="text-sm opacity-70">View your daily/weekly hours, active sessions, and recent activity</p>
                  </div>
                  <div className="card bg-base-200 p-4 text-center">
                    <div className="text-3xl mb-2">⏱️</div>
                    <h4 className="font-semibold">Time Tracking</h4>
                    <p className="text-sm opacity-70">Clock in/out of projects and tickets with detailed session tracking</p>
                  </div>
                  <div className="card bg-base-200 p-4 text-center">
                    <div className="text-3xl mb-2">📋</div>
                    <h4 className="font-semibold">Timesheet View</h4>
                    <p className="text-sm opacity-70">Review your work history with detailed breakdowns by date and project</p>
                  </div>
                </div>
              </div>

              {/* Navigation Guide */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-primary">🧭 Navigation Guide</h3>
                <div className="overflow-x-auto">
                  <table className="table table-zebra w-full">
                    <thead>
                      <tr>
                        <th>Page</th>
                        <th>What You Can Do</th>
                        <th>When to Use</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><span className="badge badge-primary">🏠 Home</span></td>
                        <td>View personal dashboard, join teams, access quick stats</td>
                        <td>Daily check-ins, team joining</td>
                      </tr>
                      <tr>
                        <td><span className="badge badge-secondary">📁 Projects</span></td>
                        <td>Clock in/out of tickets, manage work sessions</td>
                        <td>During work hours, task switching</td>
                      </tr>
                      <tr>
                        <td><span className="badge badge-accent">📊 Timesheet</span></td>
                        <td>Review work history, verify hours, export data</td>
                        <td>Weekly reviews, payroll verification</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tips & Best Practices */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-primary">💡 Tips & Best Practices</h3>
                <div className="alert alert-info">
                  <div>
                    <h4 className="font-semibold">✅ Do's</h4>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>• Clock in/out immediately when starting/stopping work</li>
                      <li>• Use descriptive ticket names for better tracking</li>
                      <li>• Review your timesheet weekly for accuracy</li>
                      <li>• Keep your dashboard updated for better visibility</li>
                    </ul>
                  </div>
                </div>
                <div className="alert alert-warning">
                  <div>
                    <h4 className="font-semibold">⚠️ Don'ts</h4>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>• Don't forget to clock out at the end of the day</li>
                      <li>• Don't leave sessions running overnight</li>
                      <li>• Don't use vague or unclear ticket descriptions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Section */}
      {activeTab === 'admin' && (
        <div className="guide-section">
          <div className="card bg-base-100 shadow-lg mb-8">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-6">👑 For Admins & Team Leaders</h2>
              
              {/* Admin Overview */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-primary">🎯 Admin Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card bg-base-200 p-6">
                    <h4 className="font-semibold mb-3">📈 Team Management</h4>
                    <ul className="text-sm space-y-2">
                      <li>• Create and manage multiple teams</li>
                      <li>• Invite team members with join codes</li>
                      <li>• Monitor team performance and activity</li>
                      <li>• Assign team leaders and admins</li>
                    </ul>
                  </div>
                  <div className="card bg-base-200 p-6">
                    <h4 className="font-semibold mb-3">📊 Analytics & Reporting</h4>
                    <ul className="text-sm space-y-2">
                      <li>• View comprehensive team dashboards</li>
                      <li>• Track individual and team productivity</li>
                      <li>• Generate detailed timesheet reports</li>
                      <li>• Monitor project progress and hours</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Setup Process */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-primary">⚙️ Initial Setup Process</h3>
                <div className="steps steps-vertical lg:steps-horizontal">
                  <div className="step step-primary">
                    <div className="text-left">
                      <h4 className="font-semibold">1. Create Teams</h4>
                      <p className="text-sm opacity-70">Go to Teams page and create projects for your organization</p>
                    </div>
                  </div>
                  <div className="step step-primary">
                    <div className="text-left">
                      <h4 className="font-semibold">2. Generate Join Codes</h4>
                      <p className="text-sm opacity-70">Each team gets a unique join code for member invitations</p>
                    </div>
                  </div>
                  <div className="step step-primary">
                    <div className="text-left">
                      <h4 className="font-semibold">3. Create Tickets</h4>
                      <p className="text-sm opacity-70">Add specific tasks and projects for team members to work on</p>
                    </div>
                  </div>
                  <div className="step step-primary">
                    <div className="text-left">
                      <h4 className="font-semibold">4. Monitor Progress</h4>
                      <p className="text-sm opacity-70">Use admin dashboard to track team performance and hours</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Features */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-primary">🛠️ Admin Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="card bg-base-200 p-4 text-center">
                    <div className="text-3xl mb-2">🏠</div>
                    <h4 className="font-semibold">Team Dashboard</h4>
                    <p className="text-sm opacity-70">Real-time view of all team member activities and hours</p>
                  </div>
                  <div className="card bg-base-200 p-4 text-center">
                    <div className="text-3xl mb-2">👥</div>
                    <h4 className="font-semibold">Member Management</h4>
                    <p className="text-sm opacity-70">Add/remove team members, manage roles and permissions</p>
                  </div>
                  <div className="card bg-base-200 p-4 text-center">
                    <div className="text-3xl mb-2">📋</div>
                    <h4 className="font-semibold">Ticket Management</h4>
                    <p className="text-sm opacity-70">Create, assign, and track project tickets and tasks</p>
                  </div>
                  <div className="card bg-base-200 p-4 text-center">
                    <div className="text-3xl mb-2">📊</div>
                    <h4 className="font-semibold">Individual Timesheets</h4>
                    <p className="text-sm opacity-70">View detailed timesheets for any team member</p>
                  </div>
                </div>
              </div>

              {/* Admin Navigation */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-primary">🧭 Admin Navigation</h3>
                <div className="overflow-x-auto">
                  <table className="table table-zebra w-full">
                    <thead>
                      <tr>
                        <th>Page</th>
                        <th>Admin Functions</th>
                        <th>Best Use Cases</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><span className="badge badge-primary">🏠 Home</span></td>
                        <td>Team dashboard, member overview, quick stats</td>
                        <td>Daily monitoring, team performance checks</td>
                      </tr>
                      <tr>
                        <td><span className="badge badge-secondary">👥 Teams</span></td>
                        <td>Create teams, manage join codes, member lists</td>
                        <td>Team setup, member onboarding</td>
                      </tr>
                      <tr>
                        <td><span className="badge badge-accent">📁 Projects</span></td>
                        <td>Create tickets, assign tasks, monitor progress</td>
                        <td>Project planning, task assignment</td>
                      </tr>
                      <tr>
                        <td><span className="badge badge-info">📊 Timesheet</span></td>
                        <td>View individual timesheets, verify hours</td>
                        <td>Payroll verification, performance review</td>
                      </tr>
                      <tr>
                        <td><span className="badge badge-warning">👑 Admin Review</span></td>
                        <td>System administration, user management</td>
                        <td>User management, system configuration</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Advanced Features */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-primary">🚀 Advanced Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card bg-base-200 p-6">
                    <h4 className="font-semibold mb-3">📅 Date Filtering</h4>
                    <p className="text-sm mb-3">Use date presets and custom ranges to analyze specific time periods:</p>
                    <ul className="text-sm space-y-1">
                      <li>• Today, Yesterday, This Week</li>
                      <li>• Last 7 Days, Last 14 Days</li>
                      <li>• Custom date ranges</li>
                      <li>• Real-time updates across all views</li>
                    </ul>
                  </div>
                  <div className="card bg-base-200 p-6">
                    <h4 className="font-semibold mb-3">👤 Individual Tracking</h4>
                    <p className="text-sm mb-3">Click on any team member's name to view their detailed timesheet:</p>
                    <ul class="text-sm space-y-1">
                      <li>• Session-by-session breakdown</li>
                      <li>• Project and ticket details</li>
                      <li>• Clock-in/out times</li>
                      <li>• Total hours per day/week</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Admin Best Practices */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-primary">💡 Admin Best Practices</h3>
                <div className="alert alert-success">
                  <div>
                    <h4 className="font-semibold">✅ Recommended Practices</h4>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>• Regularly review team dashboards for insights</li>
                      <li>• Use descriptive team and ticket names</li>
                      <li>• Monitor individual timesheets for accuracy</li>
                      <li>• Keep join codes secure and share appropriately</li>
                      <li>• Set up regular timesheet review schedules</li>
                    </ul>
                  </div>
                </div>
                <div className="alert alert-error">
                  <div>
                    <h4 className="font-semibold">⚠️ Important Considerations</h4>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>• Verify timesheet accuracy before payroll processing</li>
                      <li>• Monitor for unusual patterns or discrepancies</li>
                      <li>• Ensure team members understand time tracking policies</li>
                      <li>• Keep backup records of important timesheet data</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="text-center">
        <Link href="/" className="btn btn-primary btn-lg">
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}
