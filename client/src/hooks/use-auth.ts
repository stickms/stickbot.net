import { useStore } from "@nanostores/react";
import { $guilds, $user, clearGuildId, clearGuilds, clearUser, setGuilds, setUser } from "../lib/store";
import { API_ENDPOINT } from "../env";

function useAuth() {
  const user = useStore($user);
  const guilds = useStore($guilds);

  function clearAll() {
    clearUser();
    clearGuilds();
    clearGuildId();
  }

  async function getUser() {
    const resp = await fetch(`${API_ENDPOINT}/discord/user`, { 
      credentials: 'include' 
    });

    if (!resp.ok) {
      clearUser();
      return;
    }

    const json = await resp.json();
    setUser(json['data']['user']);
  }

  async function getGuilds() {
    const resp = await fetch(`${API_ENDPOINT}/discord/guilds`, { 
      credentials: 'include' 
    });

    if (!resp.ok) {
      clearGuilds();
      return;
    }

    const json = await resp.json();
    setGuilds(json['data']['guilds']);
  }

  async function logout() {
    const resp = await fetch(`${API_ENDPOINT}/logout/discord`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!resp.ok) {
      return;
    }

    clearAll();
  }

  const validateSession = async () => {
    const resp = await fetch(`${API_ENDPOINT}/validate-session`, { 
      method: 'POST',
      credentials: 'include'
    });

    if (!resp.ok) {
      clearAll();
      return;
    }
  }

  return {
    user,
    guilds,
    getUser,
    getGuilds,
    logout,
    validateSession
  }
}

export default useAuth;
