import { useParams } from "react-router-dom";

function SteamProfile() {
  const { steamid } = useParams();

  return (
    <div className="flex justify-center items-center text-3xl min-h-screen">
      Profile: { steamid }
    </div>
  );
}

export default SteamProfile;
