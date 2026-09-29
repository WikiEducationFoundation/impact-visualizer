import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import TopicService from "../services/topic.service";
import type Topic from "../types/topic.type";

interface UseTopicArticleMutationsOptions {
  onRemoved?: (title: string) => void;
}

function useTopicArticleMutations(
  topicId: string | number | undefined,
  { onRemoved }: UseTopicArticleMutationsOptions = {},
) {
  const queryClient = useQueryClient();

  const syncTopic = (updatedTopic: Topic) => {
    queryClient.invalidateQueries({
      queryKey: ["articleAnalytics", String(topicId)],
    });
    queryClient.setQueryData(["topic", String(topicId)], updatedTopic);
  };

  const removeArticleMutation = useMutation({
    mutationFn: (title: string) => TopicService.removeArticle(topicId!, title),
    onSuccess: (updatedTopic, title) => {
      syncTopic(updatedTopic);
      onRemoved?.(title);
      toast.success(`Removed "${title}" from this topic`);
    },
    onError: () => toast.error("Failed to remove article"),
  });

  const addArticleMutation = useMutation({
    mutationFn: (title: string) => TopicService.addArticle(topicId!, title),
    onSuccess: (updatedTopic, title) => {
      syncTopic(updatedTopic);
      toast.success(`Added "${title}" to this topic`);
    },
    onError: (error) => {
      const message = (error as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      toast.error(message ?? "Failed to add article");
    },
  });

  return { addArticleMutation, removeArticleMutation };
}

export { useTopicArticleMutations };
