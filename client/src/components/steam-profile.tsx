import { Card } from "@radix-ui/themes";
import { useEffect } from "react";

function SteamProfile({ steamid }: { steamid: string }) {
  useEffect(() => {
    console.log(steamid);
  }, [ steamid ]);

  return (
    <Card className='mx-2 mb-2 min-h-50 min-w-60 max-w-[80vw] flex-shrink-0'>
      {steamid}
    </Card>
  );
}

export default SteamProfile;
