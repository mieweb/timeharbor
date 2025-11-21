import { createClient } from '@/lib/supabase/server'
import { createTeam, joinTeam } from '@/lib/actions/teams'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Welcome, {user?.email}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Your Teams</h2>
          {teams && teams.length > 0 ? (
            <ul className="space-y-2">
              {teams.map((team) => (
                <li key={team.id} className="p-3 bg-gray-50 rounded hover:bg-gray-100">
                  <Link href={`/teams?id=${team.id}`} className="block">
                    <span className="font-medium">{team.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({team.code})</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">You are not in any teams yet.</p>
          )}
        </div>

        <div className="space-y-6">
          <div className="border p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Create Team</h2>
            <form action={createTeam} className="flex gap-2">
              <input 
                name="name" 
                placeholder="Team Name" 
                required 
                className="flex-1 border p-2 rounded"
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Create
              </button>
            </form>
          </div>

          <div className="border p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Join Team</h2>
            <form action={joinTeam} className="flex gap-2">
              <input 
                name="code" 
                placeholder="Team Code" 
                required 
                className="flex-1 border p-2 rounded"
              />
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                Join
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
