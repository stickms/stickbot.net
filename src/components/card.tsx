import '~/styles/card.css';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
	return <div className={`card ${className ?? ''}`} {...props} />;
}
