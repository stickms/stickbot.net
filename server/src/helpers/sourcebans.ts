import { parse as HTMLParse } from 'node-html-parser';

class Sourcebans {
  private static SOURCEBAN_EXT = 'index.php?p=banlist&advType=steam&advSearch=';

  private static SOURCEBAN_URLS = [
    'https://www.skial.com/sourcebans/',
    'https://lazypurple.com/sourcebans/'
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

  private static async getWebData(
    steamid: string
  ): Promise<Response[]> {
    const accountid = Number(BigInt(steamid) & BigInt(0xFFFFFFFF));

    const gets = this.SOURCEBAN_URLS.map((entry) => {
      let url = entry + this.SOURCEBAN_EXT;
      
      if (entry === 'https://www.skial.com/sourcebans/') {
        // SteamID3 (skial only for now)
        url += `[U:1:${accountid}]`;
      } else {
        // SteamID2 but with regex
        url += `STEAM__:${accountid & 1}:${Math.floor(accountid / 2)}`;
      }

      return fetch(url, {
        signal: AbortSignal.timeout(2500)
      });
    });

    const fulfilled = <T>(
      p: PromiseSettledResult<T>
    ): p is PromiseFulfilledResult<T> => p.status === 'fulfilled';

    return (await Promise.allSettled(gets))
      .filter(fulfilled)
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
          const accountid = Number(BigInt(steamid) & BigInt(0xFFFFFFFF));
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

    return reasons
      .map((reason) => {
        return {
          url: data.url,
          reason: reason
        };
      });
  }
}

export default Sourcebans;