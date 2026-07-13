import { useQuery } from "@tanstack/react-query";
import { fetchMultiQueryVideos, fetchHalalVideos, type YouTubeVideo, type HalalCategory } from "@/services/youtube";
import { useKidsMode } from "@/contexts/KidsModeContext";

const KIDS_ALLOW_RE = /(kid|child|story|prophet|nasheed|adhan|alphabet|dua|surah|hadith for kids|zaky|omar|omar hana|little muslim)/i;
const KIDS_BLOCK_RE = /(politic|war|death|violence|murder|dating|romance|marriage|hell|torment|controvers)/i;

export function useYouTubeVideos(category: HalalCategory, searchQuery?: string) {
  const { enabled: kidsMode } = useKidsMode();
  return useQuery<YouTubeVideo[]>({
    queryKey: ["youtube-halal", category, searchQuery, kidsMode ? "kids" : "std"],
    queryFn: async () => {
      const videos = searchQuery
        ? await fetchHalalVideos(searchQuery, 24)
        : await fetchMultiQueryVideos(24);

      const byCategory = category === "All" ? videos : videos.filter((v) => v.category === category);
      if (!kidsMode) return byCategory;
      return byCategory.filter((v) => {
        const text = `${v.title} ${v.channelTitle}`;
        if (KIDS_BLOCK_RE.test(text)) return false;
        return KIDS_ALLOW_RE.test(text) || v.halalScore >= 65;
      });
    },
    staleTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
