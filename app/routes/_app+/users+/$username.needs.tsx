import { data } from 'react-router'
import BoardFooter from '#app/components/board/board-footer'
import { NeedItem } from '#app/components/needs/need-item.tsx'
import  { type Need } from '#app/components/needs/type.ts'
import { Card, CardContent } from '#app/components/ui/card'
import { useBoardNavigation } from '#app/hooks/use-board-navigation'
import { requireUserId } from '#app/utils/auth.server'
import { loadBoardData } from '#app/utils/board-loader.server'
import { prisma } from '#app/utils/db.server'
import { type Route } from './+types/$username.needs'

// Reuse the action from the needs board
export { action } from '../_needs+/_needs.board.actions.server.ts'


export async function loader({ params, request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const url = new URL(request.url)

	// Find the profile user
	const profileUser = await prisma.user.findFirst({
		where: { username: params.username },
		select: { id: true, name: true, username: true },
	})

	if (!profileUser) {
		throw new Response('User not found', { status: 404 })
	}

	// Use the board loader but filter by the profile user's ID
	const boardData = await loadBoardData(
		{ url, userId },
		{
			type: 'NEED',
			model: prisma.request,
			where: {
				type: 'NEED',
				status: 'ACTIVE',
				userId: profileUser.id,
			},
			getCategoryWhere: () => ({ type: 'NEED', active: true }),
			select: {
				id: true,
				user: {
					select: {
						id: true,
						name: true,
						image: { select: { objectKey: true } },
						username: true,
					},
				},
				category: { select: { name: true } },
				description: true,
				createdAt: true,
				fulfilled: true,
				response: true,
			},
			transformResponse: (items, user) =>
				items.map((data) => ({
					...data,
					canModerate: user.roles.some((role) =>
						['admin', 'moderator'].includes(role.name),
					),
				})),
		},
	)

	return data({
		canModerate: boardData.user.roles.some((role) =>
			['admin', 'moderator'].includes(role.name),
		),
		needs: boardData.items,
		hasNextPage: boardData.hasNextPage,
		userDisplayName: profileUser.name ?? profileUser.username,
		...boardData,
	})
}

export default function UserNeedsTab({ loaderData, actionData }: Route.ComponentProps) {
	const { needs, hasNextPage, userDisplayName, canModerate, userId: currentUserId } = loaderData
	const { getNextPageUrl } = useBoardNavigation()

	if (needs.length === 0) {
		return (
			<Card>
				<CardContent className="p-6 text-center text-muted-foreground">
					{userDisplayName} hasn't posted any needs yet.
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-4">
			<div className="grid gap-4">
				{
					needs.map((need: Need) => (
						<NeedItem
							key={need.id}
							need={need}
							actionData={actionData}
							isCurrentUser={need.user.id === currentUserId}
							canModerate={canModerate}
						/>
					))
				}
			</div>
			<BoardFooter getNextPageUrl={getNextPageUrl} hasNextPage={hasNextPage} />
		</div>
	)
}
