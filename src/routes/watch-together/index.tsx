import { createFileRoute } from '@tanstack/react-router';
import { LogInIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '~/components/ui/field';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '~/components/ui/input-group';

export const Route = createFileRoute('/watch-together/')({
	component: RouteComponent,
});

function LogIn({ setUsername }: { setUsername: (arg: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const login = () => {
		if (!inputRef.current?.value) {
			return;
		}

		localStorage.setItem('username', inputRef.current.value);
		setUsername(inputRef.current.value);
	};

  return (
    <Field className="w-80 max-w-[90vw]">
      <FieldLabel htmlFor="username">Username</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id="username"
          ref={inputRef}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              login();
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label="Login"
            title="Login"
            size="icon-xs"
            variant="secondary"
            onClick={login}
          >
            <LogInIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <FieldDescription className="text-left">
        Enter a username to create or browse rooms!
      </FieldDescription>
    </Field>
  );
}

function RouteComponent() {
	const [username, setUsername] = useState<string | null>(
		localStorage.getItem('username'),
	);

	const logout = () => {
		localStorage.removeItem('username');
		setUsername(null);
	};

	return (
		<div className="w-full flex flex-col items-center justify-center mt-40 mb-8 gap-8 text-center">
			<h1 className="font-header text-6xl">watch together</h1>
			{!username && <LogIn setUsername={setUsername} />}
			{username && (
				<div className="flex flex-col items-center gap-4">
					<span>Welcome, {username}!</span>
					<Button variant="secondary" className="w-30" onClick={logout}>
						Logout
					</Button>
				</div>
			)}
		</div>
	);
}
