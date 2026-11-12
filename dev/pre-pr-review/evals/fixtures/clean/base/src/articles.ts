export interface Article {
  id: string;
  title: string;
  body: string;
}

export function wordCount(article: Article): number {
  const words = article.body.trim().split(/\s+/);
  return words[0] === "" ? 0 : words.length;
}
