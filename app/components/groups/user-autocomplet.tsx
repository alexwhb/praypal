import { Img } from 'openimg/react'
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '#app/components/ui/avatar.tsx'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '#app/components/ui/command.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#app/components/ui/popover.tsx'
import { type UserSearchResult } from '#app/routes/resources+/users.search.tsx'
import { cn, getUserImgSrc } from '#app/utils/misc.tsx'
import { Button } from '../ui/button'

interface UserAutocompleteProps {
	onQueryChange: (query: string) => void
	onSelect: (user: UserSearchResult) => void
	isOpen: boolean
	setIsOpen: (open: boolean) => void
	isLoading: boolean
	className?: string
	users: UserSearchResult[]
}

export function UserAutocomplete({
	onQueryChange,
	users,
	onSelect,
	isOpen,
	setIsOpen,
	isLoading,
	className,
}: UserAutocompleteProps) {
	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={isOpen}
					className={cn('w-full justify-between text-left', className)}
				>
					<span className="truncate">Select user...</span>
					<Icon
						name="chevrons-up-down"
						className="ml-2 h-4 w-4 shrink-0 opacity-50"
					/>
				</Button>
			</PopoverTrigger>
			<PopoverContent className={className}>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder="Search user..."
						onValueChange={(newValue: string) => onQueryChange(newValue)}
					/>
					<CommandList>
						{isLoading ? (
							<div className="text-muted-foreground animate-pulse py-6 text-center text-sm">
								Loading users...
							</div>
						) : (
							<>
								{users.length === 0 ? (
									<CommandEmpty>No user found.</CommandEmpty>
								) : (
									<CommandGroup>
										{users.map((user) => (
											<CommandItem
												key={user.id}
												value={user.id}
												onSelect={() => {
													onSelect(user)
													setIsOpen(false)
												}}
											>
												<Avatar className="border-background h-6 w-6 border-2">
													<AvatarImage
														src={getUserImgSrc(user.objectKey)}
														asChild
													/>
													<Img
														src={getUserImgSrc(user.objectKey)}
														alt={user.name || user.username}
														className="h-full w-full object-cover"
														width={64}
														height={64}
													/>
													<AvatarFallback>
														{(user.name || user.username)[0]}
													</AvatarFallback>
												</Avatar>
												{user.name}
											</CommandItem>
										))}
									</CommandGroup>
								)}
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
