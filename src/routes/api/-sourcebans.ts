import { parse as HTMLParse } from 'node-html-parser';
import { parseSteamID } from './-utils';

const SOURCEBAN_EXT = 'index.php?p=banlist&advType=steam&advSearch=';

const SOURCEBAN_URLS = [
  'http://thefurrypound.org/sourcebans/',
  'https://lazypurple.com/sourcebans/',
  'https://www.skial.com/sourcebans/',
  'https://sappho.io/bans/',
  'https://bans.blackwonder.tf/',
  'https://bans.wonderland.tf/',
  'https://sourcebans.gflclan.com/',
  'https://bans.elite-hunterz.info/',
  'https://coldcommunity.com/sourcebans/',
  'https://outbreak-community.com/sourcebans/',
  'http://gavlemg.org/sourcebans/',
  'https://adultgamerscommunity.com/sourcebans/',
  'https://tf2-casual-fun.de/sourcebans/',
  'https://triggerhappygamers.com/sourcebans/',
  'https://sourcebans.gamerzhost.de/sb154/',
  'https://disc-ff.site.nfoservers.com/sourcebanstf2/',
  'https://bans.snksrv.com/',
  'https://facebans.com/',
  'https://firepoweredgaming.com/sourcebanspp/',
  'https://bans.cutiepie.tf/',
  'https://bans.flux.tf/',
  'https://sg-gaming.net/bans/',
  'https://bans.pubs.tf/',
  'https://petrol.tf/sb/',
  'https://sb.vaultf4.com/',
  'https://bans.tf2trade.com/',
  'https://bans.harpoongaming.com/',
  'https://dmfrenzy.com/bans/',
  'https://spectre.gg/bans/',
  'https://astramania.ro/sban2/',
  'https://www.mestrogaming.net/secureplay/',
  'https://infinityteamcsgo.com/sourcebans/',
  'https://www.psihijatrija-csgo.xyz/',
  'https://sourcebans.acekill.pl/',
  'http://sixth.site.nfoservers.com/SourceBans/',
  'https://karma-gaming.net/sourcebans/',
  'https://sb.ugc-gaming.net/',
  'https://bans.svdosbrothers.com/',
  'https://bans.panda-community.com/'
];

export type SourcebanResult = { url: string; reason: string };

function buildUrl(baseUrl: string, steamid: string): string {
  const accountid = Number(BigInt(steamid) & BigInt(0xffffffff));
  let url = baseUrl + SOURCEBAN_EXT;

  if (baseUrl === 'https://www.skial.com/sourcebans/') {
    url += `[U:1:${accountid}]`;
  } else {
    url += `STEAM__:${accountid & 1}:${Math.floor(accountid / 2)}`;
  }

  return url;
}

function parseHTML(steamid: string, html: string, responseUrl: string): SourcebanResult[] {
  const dom = HTMLParse(html);
  const accountid = Number(BigInt(steamid) & BigInt(0xffffffff));
  const steamid2 = `STEAM_[01]:${accountid & 1}:${Math.floor(accountid / 2)}`;

  let divs = dom.querySelectorAll('div.opener').length
    ? dom.querySelectorAll('div.opener')
    : dom.querySelectorAll('div.collapse');

  let reasons: string[] = divs
    .filter((div) => {
      return div.getElementsByTagName('td').some((td) => {
        const regex1 = new RegExp(steamid);
        const regex2 = new RegExp(`^${steamid2}$`);

        return (
          (td.innerText === 'Steam Community' &&
            regex1.test(td.nextElementSibling?.innerText ?? '')) ||
          (td.innerText === 'Steam ID' &&
            regex2.test(td.nextElementSibling?.innerText ?? ''))
        );
      });
    })
    .map((div) => {
      for (const td of div.getElementsByTagName('td')) {
        if (td.innerText === 'Reason') {
          return td.nextElementSibling?.innerText ?? 'Unknown Reason';
        }
      }
      return 'Unknown Reason';
    });

  // Fluent Design Theme fallback
  if (!divs.length) {
    divs = dom.querySelectorAll('div.collapse_content');

    reasons = divs
      .filter((div) => {
        return div.getElementsByTagName('span').some((span) => {
          const regex = new RegExp(steamid);
          return (
            span.innerText.match(/.+Steam Community/) &&
            span.nextElementSibling?.innerText?.match(regex)
          );
        });
      })
      .map((div) => {
        for (const span of div.getElementsByTagName('span')) {
          if (span.innerText.match(/.+Reason/)) {
            return span.nextElementSibling?.innerText ?? 'Unknown Reason';
          }
        }
        return 'Unknown Reason';
      });
  }

  return reasons.map((reason) => ({ url: responseUrl, reason }));
}

async function fetchAndParse(baseUrl: string, steamid: string): Promise<SourcebanResult[]> {
  const url = buildUrl(baseUrl, steamid);
  const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
  const html = await response.text();
  return parseHTML(steamid, html, response.url);
}

export async function getSourcebans(steamid: string): Promise<SourcebanResult[]> {
  const communityId = parseSteamID(steamid);
  if (!communityId) {
    return [];
  }

  const results = await Promise.allSettled(
    SOURCEBAN_URLS.map((baseUrl) => fetchAndParse(baseUrl, communityId))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<SourcebanResult[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}
