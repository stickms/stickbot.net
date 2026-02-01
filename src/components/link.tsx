import { createLink, type LinkComponent } from '@tanstack/react-router';
import * as React from 'react';
import '~/styles/link.css';

interface BasicLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	// Add any additional props you want to pass to the anchor element
}

const BasicLinkComponent = React.forwardRef<HTMLAnchorElement, BasicLinkProps>(
	(props, ref) => {
		return <a ref={ref} {...props} className="link" />;
	},
);

const CreatedLinkComponent = createLink(BasicLinkComponent);

export const Link: LinkComponent<typeof BasicLinkComponent> = (props) => {
	return <CreatedLinkComponent preload={'intent'} {...props} />;
};
