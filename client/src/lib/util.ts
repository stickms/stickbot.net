export function fetchGetJson(resp: Response) {
  if (!resp.ok) {
    throw new Error(resp.statusText);
  }

  return resp.json();
}
