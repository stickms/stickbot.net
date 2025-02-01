import { parse as HTMLParse } from 'node-html-parser';

class Sourcebans {
  private static SOURCEBAN_EXT = 'index.php?p=banlist&advType=steam&advSearch=';

  private static SOURCEBAN_URLS = [
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

  static async get(
    steamid: string
  ): Promise<{ url: string; reason: string }[]> {
    const sourcebans: { url: string; reason: string }[] = [];

    const web_data = await this.getWebData(steamid);

    for (const data of web_data) {
      const parsed = await this.parseWebHTML(steamid, data);

      if (parsed.length) {
        sourcebans.push(...parsed);
      }
    }

    return sourcebans;
  }

  private static async fetchTimeout(
    url: string,
    timeout = 1000
  ): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        fetch(url, { signal: controller.signal })
          .then((response) => resolve(response))
          .catch((error) => reject(error))
          .finally(() => clearTimeout(timeoutId));
      } catch (error) {
        reject(error);
      }
    });
  }

  private static async getWebData(steamid: string): Promise<Response[]> {
    const accountid = Number(BigInt(steamid) & BigInt(0xffffffff));

    const gets = this.SOURCEBAN_URLS.map((entry) => {
      let url = entry + this.SOURCEBAN_EXT;

      if (entry === 'https://www.skial.com/sourcebans/') {
        // SteamID3 (skial only for now)
        url += `[U:1:${accountid}]`;
      } else {
        // SteamID2 but with regex
        url += `STEAM__:${accountid & 1}:${Math.floor(accountid / 2)}`;
      }

      return this.fetchTimeout(url, 2000);
    });

    return (await Promise.allSettled(gets))
      .filter((p) => {
        return p.status === 'fulfilled';
      })
      .map((x) => x.value);
  }

  private static async parseWebHTML(
    steamid: string,
    data: Response
  ): Promise<{ url: string; reason: string }[]> {
    const dom = HTMLParse(await data.text());

    let divs = dom.querySelectorAll('div.opener').length
      ? dom.querySelectorAll('div.opener')
      : dom.querySelectorAll('div.collapse');

    let reasons: string[] = divs
      .filter((div) => {
        return div.getElementsByTagName('td').some((td) => {
          const accountid = Number(BigInt(steamid) & BigInt(0xffffffff));
          const steamid2 = `STEAM_[01]:${accountid & 1}:${Math.floor(accountid / 2)}`;

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

    // If we can't find that div, we probably have a "Fluent Design" Theme
    if (!divs.length) {
      divs = dom.querySelectorAll('div.collapse_content');

      reasons = divs
        .filter((div) => {
          return div.getElementsByTagName('span').some((span) => {
            const regex = new RegExp(steamid);
            return (
              span.innerText.match(new RegExp('.+Steam Community')) &&
              span.nextElementSibling?.innerText?.match(regex)
            );
          });
        })
        .map((div) => {
          for (const span of div.getElementsByTagName('span')) {
            if (span.innerText.match(new RegExp('.+Reason'))) {
              return span.nextElementSibling?.innerText ?? 'Unknown Reason';
            }
          }

          return 'Unknown Reason';
        });
    }

    return reasons.map((reason) => {
      return {
        url: data.url,
        reason: reason
      };
    });
  }
}

export default Sourcebans;
