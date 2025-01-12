import { useStore } from '@nanostores/react';
import {
  $guilds,
  $user,
  clearGuildId,
  clearGuilds,
  clearUser,
  setAdmin,
  setGuilds,
  setUser
} from '../lib/store';
import { API_ENDPOINT } from '../env';
import useToast from './use-toast';

function useAuth() {
  const user = useStore($user);
  const guilds = useStore($guilds);

  const { toast } = useToast();

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
    setUser(json['data']);
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
    setGuilds(json['data']);
  }

  async function logout() {
    const resp = await fetch(`${API_ENDPOINT}/logout/discord`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!resp.ok) {
      toast({
        title: 'Error: Could not logout',
        description: 'Please try again later'
      });
      return;
    }

    clearAll();
  }

  const generateApiToken = async (
    guildid: string
  ): Promise<string | undefined> => {
    const resp = await fetch(
      `${API_ENDPOINT}/bot/generate-token?guildid=${guildid}`,
      {
        method: 'POST',
        credentials: 'include'
      }
    );

    if (!resp.ok) {
      toast({
        title: 'Error: Could not generate API token',
        description: 'Please try again later'
      });
      return;
    }

    const json = await resp.json();
    return json['data'];
  };

  const revokeApiToken = async () => {
    const resp = await fetch(`${API_ENDPOINT}/bot/revoke-token`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!resp.ok) {
      toast({
        title: 'Error: Could not revoke API token',
        description: 'Please try again later'
      });
      return;
    }

    setUser({
      ...user,
      token_guild: ''
    });
  };

  const validateSession = async () => {
    const resp = await fetch(`${API_ENDPOINT}/validate-session`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!resp.ok) {
      clearAll();
      return;
    }
  };

  const validateAdmin = async () => {
    const resp = await fetch(`${API_ENDPOINT}/admin/validate`, {
      credentials: 'include'
    });

    if (!resp.ok) {
      setAdmin(false);
      return;
    }

    setAdmin(true);
  };

  return {
    user,
    guilds,
    getUser,
    getGuilds,
    logout,
    generateApiToken,
    revokeApiToken,
    validateSession,
    validateAdmin
  };
}

export default useAuth;
