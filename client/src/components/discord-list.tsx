import { Button, Link, Select } from "@radix-ui/themes";
import { useState } from "react";
import { API_ENDPOINT } from "../env";
import { DiscordLogoIcon } from "@radix-ui/react-icons";

function DiscordList() {
  const [ user, setUser ] = useState<string>();

  if (!user) {
    return (
      <Link href={`${API_ENDPOINT}/login/discord`}>
        <Button className='cursor-pointer'>
          <DiscordLogoIcon /> Login
        </Button>
      </Link>
    );
  }

  return (
    <Select.Root>
      <Select.Trigger />
      <Select.Content>
        <Select.Group>
          <Select.Label>
            Search by Server
          </Select.Label>
          
        </Select.Group>
      </Select.Content>
    </Select.Root>
  );
}

export default DiscordList;
