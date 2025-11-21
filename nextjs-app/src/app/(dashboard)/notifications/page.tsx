import PushNotificationManager from '@/components/PushNotificationManager'

export default function NotificationsPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>
      
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-xl font-semibold mb-4">Push Notifications</h2>
        <p className="text-gray-600 mb-4">
          Enable push notifications to receive updates about clock events, tickets, and team activity.
        </p>
        <PushNotificationManager />
      </div>
    </div>
  )
}
