import { useCallback } from 'react'
import { data, useSearchParams } from 'react-router'
import BoardFooter from '#app/components/board/board-footer'
import BoardHeader from '#app/components/board/board-header'
import GroupCard from '#app/components/groups/group-card.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { loadBoardData } from '#app/utils/board-loader.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { type Route } from './+types/groups.board.ts'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request).catch(() => null)
	const url = new URL(request.url)

	// First query: Fetch groups with leader's membership
	const boardData = await loadBoardData(
		{ url, userId },
		{
			type: 'GROUP',
			model: prisma.group,
			where: {
				active: true,
				category: {
					type: 'GROUP',
					active: true,
				},
			},
			getCategoryWhere: () => ({ type: 'GROUP', active: true }),
			select: {
				id: true,
				name: true,
				description: true,
				frequency: true,
				meetingTime: true,
				location: true,
				isOnline: true,
				isPrivate: true,
				capacity: true,
				createdAt: true,
				category: { select: { name: true } },
				_count: { select: { memberships: true } },
				memberships: {
					where: { role: 'LEADER' },
					select: {
						user: {
							select: {
								id: true,
								name: true,
								image: { select: { objectKey: true } },
								username: true,
							},
						},
					},
				},
			},
		},
	)
	
	// Get group IDs from the result
	const groupIds = boardData.items.map((group) => group.id)

	// Second query: Fetch current user's memberships for these groups
	const userMemberships = await prisma.groupMembership.findMany({
		where: {
			userId,
			groupId: { in: groupIds },
		},
		select: {
			groupId: true,
			role: true,
			status: true,
		},
	})

	// Create a map for quick lookup
	const userMembershipMap = new Map(userMemberships.map((m) => [m.groupId, m]))

	// Transform the response with both queries' data
	const transformedGroups = boardData.items.map((group) => {
		const userMembership = userMembershipMap.get(group.id)
		// Update to check for both ACTIVE and APPROVED statuses
		const isMember = !!userMembership && 
						(userMembership.status === 'ACTIVE' || userMembership.status === 'APPROVED')
		const isLeader = userMembership?.role === 'LEADER' && 
						(userMembership.status === 'ACTIVE' || userMembership.status === 'APPROVED')
		const isPending = !!userMembership && userMembership.status === 'PENDING'
		const leader = group.memberships[0]?.user // Leader's user info

		return {
			...group,
			isMember,
			isLeader,
			isPending,
			memberCount: group._count.memberships,
			hasCapacity: !group.capacity || group._count.memberships < group.capacity,
			canModerate: boardData.user.roles.some((role) =>
				['admin', 'moderator'].includes(role.name),
			),
			user: leader,
		}
	})

	return data({
		groups: transformedGroups,
		filters: boardData.filters,
		activeFilter: boardData.activeFilter,
		canModerate: boardData.user.roles.some((role) =>
			['admin', 'moderator'].includes(role.name),
		),
		userId,
		hasNextPage: boardData.hasNextPage,
		total: boardData.total,
		page: boardData.page,
	})
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const groupId = formData.get('groupId')
	const action = formData.get('_action')

	if (action === 'join') {
		console.log('Join action triggered for group:', groupId, 'by user:', userId)
		
		// Check capacity and get group details
		const group = await prisma.group.findUnique({
			where: { id: groupId as string },
			select: {
				isPrivate: true,
				capacity: true,
				_count: { 
					select: { 
						memberships: true 
					} 
				}
			}
		})

		console.log('Group details:', group)

		if (!group) {
			return data({ error: 'Group not found' }, { status: 404 })
		}

		if (group.capacity && group._count.memberships >= group.capacity) {
			return data({ error: 'Group is at capacity' }, { status: 400 })
		}

		// Check if user already has a membership
		const existingMembership = await prisma.groupMembership.findUnique({
			where: {
				userId_groupId: {
					userId,
					groupId: groupId as string,
				}
			}
		})
		
		console.log('Existing membership:', existingMembership)
		
		// If user already has a membership, don't create a new one
		if (existingMembership) {
			console.log('User already has membership with status:', existingMembership.status)
			return data({ 
				success: true, 
				message: existingMembership.status === 'PENDING' 
					? 'Your request to join is already pending approval.' 
					: existingMembership.status === 'APPROVED' || existingMembership.status === 'ACTIVE'
						? 'You are already a member of this group.'
						: 'Your membership status is being reviewed.'
			})
		}

		console.log('Creating new membership with status:', group.isPrivate ? 'PENDING' : 'APPROVED')
		
		// Create a new membership with appropriate status - use APPROVED instead of ACTIVE
		await prisma.groupMembership.create({
			data: {
				userId,
				groupId: groupId as string,
				role: 'MEMBER',
				status: group.isPrivate ? 'PENDING' : 'APPROVED', // Changed from ACTIVE to APPROVED
			},
		})

		return data({ success: true, message: group.isPrivate ? 'Your request to join has been submitted.' : 'You have joined the group.' })
	} else if (action === 'leave') {
		await prisma.groupMembership.delete({
			where: {
				userId_groupId: {
					userId,
					groupId: groupId as string,
				},
			},
		})
		return data({ success: true })
	} else if (action === 'delete') {
		// TODO invalidate our total cache value whenever we remove an element.
		const moderatorAction = formData.get('moderatorAction') === '1'

		if (moderatorAction) {
			await prisma.moderationLog.create({
				data: {
					moderatorId: userId,
					itemId: groupId as string,
					itemType: 'GROUP',
					action: 'DELETE',
					reason: (formData.get('reason') as string) || 'Moderation action',
				},
			})
		}

		await prisma.group.update({
			where: { id: groupId as string },
			data: { active: false },
		})
		return data({ success: true })
	}
}

export default function GroupsBoard({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const {
		groups,
		filters,
		activeFilter,
		canModerate,
		userId: currentUserId,
		hasNextPage,
	} = loaderData

	const [searchParams] = useSearchParams()

	// Helper to generate URLs with updated search params
	const generateUrl = useCallback(
		(newParams: Record<string, string | number>) => {
			const params = new URLSearchParams(searchParams)
			Object.entries(newParams).forEach(([key, value]) => {
				if (value === undefined || value === null || value === '') {
					params.delete(key)
				} else {
					params.set(key, String(value))
				}
			})
			return `?${params.toString()}`
		},
		[searchParams],
	)

	// Generate URLs for different actions
	const getSortUrl = useCallback(() => {
		// we toggle our sort.
		const currentSort = searchParams.get('sort') === 'asc' ? 'asc' : 'desc'
		const newSort = currentSort === 'asc' ? 'desc' : 'asc'
		return generateUrl({ sort: newSort, page: 1 })
	}, [generateUrl, searchParams])

	const getFilterUrl = useCallback(
		(newFilter: string) => {
			return generateUrl({ filter: newFilter, page: 1 })
		},
		[generateUrl],
	)

	const getNextPageUrl = useCallback(() => {
		const currentPage = parseInt(searchParams.get('page') || '1', 10)
		return generateUrl({ page: currentPage + 1 })
	}, [generateUrl, searchParams])

	return (
		<div className="space-y-6">
			<BoardHeader
				filters={filters}
				activeFilter={activeFilter}
				getFilterUrl={getFilterUrl}
				getSortUrl={getSortUrl}
				newActionToolTipString="Create New Group"
			/>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{groups.length > 0 ? (
					groups.map((group) => (
						<GroupCard
							key={group.id}
							group={group}
							actionData={actionData}
							canModerate={canModerate}
							isCurrentUser={group?.user?.id === currentUserId}
						/>
					))
				) : (
					<div className="col-span-full rounded-lg border p-8 text-center">
						<p className="text-muted-foreground">
							No groups found in this category.
						</p>
					</div>
				)}
			</div>
			<BoardFooter getNextPageUrl={getNextPageUrl} hasNextPage={hasNextPage} />
		</div>
	)
}
