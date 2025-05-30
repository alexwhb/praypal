import OtherPrayerItem from '#app/components/prayer/other-prayer-item.tsx'
import UserPrayerItem from '#app/components/prayer/user-prayer-item.tsx'
import  { type Prayer } from './type.ts'

interface PrayerItemProps {
	prayer: Prayer
	isCurrentUser: boolean
	canModerate: boolean
	actionData: any
	onDeleteClick?: (prayerId: string) => void,
	onMarkAsAnswered?: (prayerId: string) => void,
}

export default function PrayerItem({ prayer, isCurrentUser, actionData, canModerate }: PrayerItemProps) {
	return isCurrentUser ? (
		<UserPrayerItem prayer={prayer} actionData={actionData} />
	) : (
		<OtherPrayerItem prayer={prayer} canModerate={canModerate} />
	)
}
