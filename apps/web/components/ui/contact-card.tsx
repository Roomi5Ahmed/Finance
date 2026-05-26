import React from 'react';
import { cn } from '@/lib/utils';
import {
	LucideIcon,
	PlusIcon,
} from 'lucide-react';

export type ContactInfoProps = React.ComponentProps<'div'> & {
	icon: LucideIcon;
	label: string;
	value: string;
};

export type ContactCardProps = React.ComponentProps<'div'> & {
	// Content props
	title?: string;
	description?: string;
	contactInfo?: ContactInfoProps[];
	formSectionClassName?: string;
};

export function ContactCard({
	title = 'Contact With Us',
	description = 'If you have any questions regarding our Services or need help, please fill out the form here. We do our best to respond within 1 business day.',
	contactInfo,
	className,
	formSectionClassName,
	children,
	...props
}: ContactCardProps) {
	return (
		<div
			className={cn(
				'bg-[#0B1121] border border-white/5 relative grid h-full w-full shadow-lg shadow-black/50 md:grid-cols-2 lg:grid-cols-3 rounded-xl overflow-hidden',
				className,
			)}
			{...props}
		>
			<div className="flex flex-col justify-between lg:col-span-2">
				<div className="relative h-full space-y-4 px-4 py-8 md:p-8">
					<h1 className="text-3xl font-bold md:text-4xl lg:text-5xl text-white">
						{title}
					</h1>
					<p className="text-slate-400 max-w-xl text-sm md:text-base lg:text-lg">
						{description}
					</p>
					{contactInfo && contactInfo.length > 0 && (
					  <div className="grid gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 mt-8">
						  {contactInfo.map((info, index) => (
							  <ContactInfo key={index} {...info} />
						  ))}
					  </div>
          )}
				</div>
			</div>
			<div
				className={cn(
					'bg-[#151D2C]/80 flex h-full w-full items-center border-t border-white/5 p-5 md:col-span-1 md:border-t-0 md:border-l',
					formSectionClassName,
				)}
			>
				{children}
			</div>
		</div>
	);
}

function ContactInfo({
	icon: Icon,
	label,
	value,
	className,
	...props
}: ContactInfoProps) {
	return (
		<div className={cn('flex items-center gap-3 py-3', className)} {...props}>
			<div className="bg-indigo-500/10 rounded-lg p-3">
				<Icon className="h-5 w-5 text-indigo-400" />
			</div>
			<div>
				<p className="font-medium text-slate-200">{label}</p>
				<p className="text-slate-500 text-xs">{value}</p>
			</div>
		</div>
	);
}
