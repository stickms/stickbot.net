import { createFileRoute } from '@tanstack/react-router';
import { Minus, Plus } from 'lucide-react';
import { type QRCodeDataURLType, toDataURL } from 'qrcode';
import { type SetStateAction, useEffect, useRef, useState } from 'react';
import { Card } from '~/components/card';
import { Field, FieldLabel } from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput
} from '~/components/ui/input-group';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '~/components/ui/select';
import { Skeleton } from '~/components/ui/skeleton';

export const Route = createFileRoute('/qr-code-generator')({
	component: RouteComponent
});

function OptionsNumeric({
	label,
	value,
	onChange,
	min,
	max
}: {
	label: string;
	value: number;
	onChange: (arg: number) => void;
	min?: number;
	max?: number;
}) {
	return (
		<Field className="w-full">
			<FieldLabel>{label}</FieldLabel>
			<InputGroup>
				<InputGroupAddon>
					<InputGroupButton onClick={() => onChange(Math.max(value - 1, 0))}>
						<Minus />
					</InputGroupButton>
				</InputGroupAddon>
				<InputGroupInput
					type="number"
					className="text-center"
					value={value}
					onChange={(e) => onChange(Math.max(+e.target.value, 0))}
					min={min}
					max={max}
				/>
				<InputGroupAddon align="inline-end">
					<InputGroupButton onClick={() => onChange(Math.max(value + 1, 0))}>
						<Plus />
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
		</Field>
	);
}

function OptionDropdown<T extends string>({
	label,
	value,
	onChange,
	items
}: {
	label: string;
	value: T;
	onChange: (arg: SetStateAction<T>) => void;
	items: Record<T, string>;
}) {
	return (
		<Field className="w-full">
			<FieldLabel>{label}</FieldLabel>
			<Select value={value} onValueChange={(v) => onChange(v as T)}>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent position="popper">
					<SelectGroup>
						{(Object.entries(items) as [T, string][]).map(
							([itemvalue, itemlabel]) => (
								<SelectItem key={itemvalue} value={itemvalue}>
									{itemlabel}
								</SelectItem>
							)
						)}
					</SelectGroup>
				</SelectContent>
			</Select>
		</Field>
	);
}

function RouteComponent() {
	const [data, setData] = useState<string>('');
	const [ready, setReady] = useState<boolean>(false);

	// QR Code props
	const [size, setSize] = useState<number>(1024);
	const [margin, setMargin] = useState<number>(1);
	const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>(
		'M'
	);
	const [filetype, setFiletype] = useState<QRCodeDataURLType>('image/png');

	const imageRef = useRef<HTMLImageElement>(null);

	useEffect(() => {
		toDataURL(data, {
			width: size,
			margin: margin,
			type: filetype,
			errorCorrectionLevel: errorCorrection
		})
			.then((src) => {
				if (!imageRef.current) {
					throw new Error();
				}

				imageRef.current.src = src;
				setReady(true);
			})
			.catch(() => {
				setReady(false);
			});
	}, [data, size, margin, filetype, errorCorrection]);

	return (
		<div className="w-full min-h-screen flex flex-col items-center gap-8 text-center">
			<div className="flex-1 min-h-20" />
			<h1 className="font-header text-6xl">qr code generator</h1>
			<Input
				className="w-150 max-w-[90vw]"
				placeholder="Enter text or URL..."
				value={data}
				onChange={(e) => setData(e.target.value)}
			/>
			<Card className="flex flex-wrap justify-center max-w-[90vw] gap-4">
				<div className="size-80 aspect-square">
					{!ready && <Skeleton className="size-full" />}
					<img
						ref={imageRef}
						alt="QR Code"
						style={{
							width: '100%',
							height: '100%',
							display: ready ? undefined : 'none'
						}}
					/>
				</div>

				<div className="flex flex-col w-56 gap-4 justify-between">
					<OptionsNumeric
						label="Size (px)"
						value={size}
						onChange={setSize}
						min={0}
					/>
					<OptionsNumeric
						label="Margin (dots)"
						value={margin}
						onChange={setMargin}
						min={0}
					/>
					<OptionDropdown
						label="Error Correction"
						value={errorCorrection}
						onChange={setErrorCorrection}
						items={{ L: 'Low', M: 'Medium', Q: 'Quartile', H: 'High' }}
					/>
					<OptionDropdown
						label="Filetype"
						value={filetype}
						onChange={setFiletype}
						items={{
							'image/png': 'PNG',
							'image/jpeg': 'JPG',
							'image/webp': 'WEBP'
						}}
					/>
				</div>
			</Card>
			<div className="flex-1 min-h-8" />
		</div>
	);
}
