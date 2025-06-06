import { Img } from 'openimg/react'
import { useState } from 'react'
import { Link } from 'react-router'
import DeleteDialog from '#app/components/delete-dialog.tsx'
import MarkAsAnsweredDialog from '#app/components/prayer/mark-as-answered-dialog.tsx'
import { Avatar, AvatarFallback, AvatarImage } from '#app/components/ui/avatar.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent, CardFooter, CardHeader } from '#app/components/ui/card.tsx'
import {Icon} from '#app/components/ui/icon.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '#app/components/ui/tooltip.tsx'
import { formatDate } from '#app/utils/formatter.ts'
import { getUserImgSrc } from '#app/utils/misc.tsx'
import { type Prayer } from './type.ts'

export default function UserPrayerItem({
													prayer,
													actionData,
												}: {
	prayer: Prayer
	actionData: any
}) {
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

	return (
		<Card className={prayer.answered ? 'opacity-75' : ''}>
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<Link to={`/users/${prayer.user.username}`} prefetch="intent">
							<Avatar>
								<AvatarImage
									src={getUserImgSrc(prayer.user.image?.objectKey)}
									asChild >
									<Img
										src={getUserImgSrc(prayer.user.image?.objectKey)}
										alt={prayer.user.name}
										className="h-full w-full object-cover"
										width={64}
										height={64}
									/>
								</AvatarImage>
								<AvatarFallback>
									{prayer.user.name.charAt(0)}
								</AvatarFallback>
							</Avatar>
						</Link>
						<div>
							<h3 className="font-medium">{prayer.user.name}</h3>
							<div className="flex items-center text-sm text-muted-foreground">
								<Icon name="calendar-days" className="mr-1 h-3 w-3" />
								{formatDate(prayer.createdAt)}
							</div>
						</div>
					</div>
					<Badge variant={prayer.answered ? 'outline' : 'secondary'}>
						{prayer.category.name}
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<p className="text-sm">{prayer.description}</p>

				{prayer.answered && prayer.answeredMessage && (
					<div className="mt-4 rounded-md border border-green-100 bg-green-50  dark:border-green-100/20 dark:bg-green-200/10  p-3">
						<p className="mb-1 text-sm font-medium text-green-800 dark:text-green-200">
							Prayer Answered:
						</p>
						<p className="text-sm dark:text-green-200 text-green-800">{prayer.answeredMessage}</p>
					</div>
				)}
			</CardContent>
			<CardFooter className="flex flex-col gap-2">
				<div className="flex w-full items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="flex items-center">
							<Icon name="hand" className="mr-1 h-4 w-4" />
							<span className="text-sm text-muted-foreground">
								{prayer.prayerCount}{' '}
								{prayer.prayerCount === 1 ? 'Prayer' : 'Prayers'}
							</span>
						</div>
						{prayer.answered && (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<span className="text-sm font-medium text-green-600">
											<Icon name="check-circle" size="md" />
										</span>
									</TooltipTrigger>
									<TooltipContent>
										Prayer marked as answered
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
					</div>

					<div className="flex items-center gap-4">
						{!prayer.answered && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setIsDialogOpen(true)}
							>
								Mark as Answered
							</Button>
						)}

						<DeleteDialog
							open={isDeleteDialogOpen}
							onOpenChange={setIsDeleteDialogOpen}
							additionalFormData={{ prayerId: prayer.id }}
						/>

						<MarkAsAnsweredDialog
							actionData={actionData}
							open={isDialogOpen}
							onOpenChange={setIsDialogOpen}
							prayerId={ prayer.id }
						/>
					</div>
				</div>
			</CardFooter>
		</Card>
	)
}