import { Card } from './card';
import { Badge } from './ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from './ui/table';

export type RouteBodyType = {
	key: string;
	type: string;
	description: string;
	example: string;
};

export function ApiRoute({
	endpoint,
	method,
	fields
}: {
	endpoint: string;
	method: 'GET' | 'POST';
	fields: RouteBodyType[];
}) {
	return (
		<div className="flex flex-col items-center gap-2">
			<span className="flex gap-2 font-mono">
				<Badge className={method === 'GET' ? 'bg-green-700' : 'bg-yellow-600'}>
					{method}
				</Badge>
				{endpoint}
			</span>
			<Card className="flex flex-col gap-1">
				<span className="text-muted-foreground text-sm">JSON request body</span>
				<Table className="w-200 max-w-[90vw]">
					<TableHeader>
						<TableRow>
							<TableHead>Key</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Description</TableHead>
							<TableHead>Example</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{fields.map((field) => (
							<TableRow key={field.key} className="text-left">
								<TableCell className="font-mono">{field.key}</TableCell>
								<TableCell className="font-mono">{field.type}</TableCell>
								<TableCell className="text-sm whitespace-pre-line">
									{field.description}
								</TableCell>
								<TableCell className="font-mono">{field.example}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>
		</div>
	);
}
