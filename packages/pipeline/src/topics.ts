// Topic list storage: the owner approves a list of topics; `pc batch` makes every one of them.
import path from 'node:path';
import { TopicList } from '@papercut/schema';
import { dataDir, readJson, readJsonIf, writeJson } from '@papercut/shared';

export const topicListDir = () => path.join(dataDir(), 'topic-lists');
export const topicListFile = (id: string) => path.join(topicListDir(), `${id}.json`);
export const loadTopicList = (id: string) => TopicList.parse(readJson(topicListFile(id)));
export const loadTopicListIf = (id: string) => {
  const raw = readJsonIf(topicListFile(id));
  return raw ? TopicList.parse(raw) : undefined;
};
export const saveTopicList = (l: TopicList) => writeJson(topicListFile(l.id), l);
