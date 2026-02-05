import type { ChangeEventHandler, JSX, Ref } from 'react';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '~/components/ui/input-group';

export function InputButton({
	icon,
	className,
	id,
	ref,
	placeholder,
	value,
	invalid,
	readOnly,
	onChange,
	onSubmit,
}: {
	icon: JSX.Element;
	className?: string;
	id?: string;
	ref?: Ref<HTMLInputElement>;
	placeholder?: string;
	value?: string;
	invalid?: boolean;
	readOnly?: boolean;
	onChange?: ChangeEventHandler<HTMLInputElement>;
	onSubmit?: () => void;
}) {
	return (
		<InputGroup className={className} aria-invalid={invalid}>
			<InputGroupInput
				id={id}
				ref={ref}
				placeholder={placeholder}
				value={value}
				aria-invalid={invalid}
				readOnly={readOnly}
				onChange={onChange}
				onKeyDown={({ key }) => {
					if (key === 'Enter' && !readOnly) onSubmit?.();
				}}
			/>
			<InputGroupAddon align="inline-end">
				<InputGroupButton size="icon-xs" variant="secondary" onClick={onSubmit}>
					{icon}
				</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	);
}
