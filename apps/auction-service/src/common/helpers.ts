export const errMsg = (err): string => err instanceof Error ? err.message : String(err);

export const slugify = (text: string): string => {
    const ru = 'а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я'.split(' ');
    const en = 'a b v g d e yo zh z i y k l m n o p r s t u f kh ts ch sh shch _ y _ e yu ya'.split(' ');
    let res = text.toLowerCase().trim();
    ru.forEach((char, i) => res = res.replace(new RegExp(char, 'g'), en[i]));
    return res.replace(/[^a-z0-9_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }